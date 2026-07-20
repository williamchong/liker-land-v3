#!/usr/bin/env node
// Agent driver for the 3ook.com Nuxt app.
// Drives an already-running dev server (npm run dev) with playwright-core +
// the system Google Chrome. Run from the repo root:
//   node .claude/skills/run-3ook-com/driver.mjs <command> [args]
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT_DIR = process.env.SHOT_DIR || '/tmp/3ook-shots'
const HEADED = !!process.env.HEADED

// Noise we always see in dev and never care about: the dev CSP blocks the
// Arweave/Irys cover hosts, and analytics is unconfigured locally.
const NOISE = /Content Security Policy|posthog|intercom|crisp|favicon|ERR_BLOCKED_BY_CLIENT/i

function usage() {
  console.log(`Usage: node .claude/skills/run-3ook-com/driver.mjs <command>

  shot <path> [--wait <selector>] [--out <file>] [--mobile]
        Navigate to <path>, wait, screenshot. Prints console errors + final URL.
  text <path> [--wait <selector>]
        Navigate and dump visible text of <body> (first 3000 chars).
  flow-store
        Real user flow: bookstore home -> open first product -> screenshot both.
  routes
        Hit every top-level route and report status / redirect / error count.
  repl
        Line-oriented REPL on stdin. Commands: goto <path>, click <selector>,
        key <Key>, eval <js>, text <selector>, ss <name>, url, quit.

Env: BASE_URL (default ${BASE}), SHOT_DIR (default ${OUT_DIR}), HEADED=1`)
}

// PROFILE_DIR reuses an on-disk Chrome profile so a wallet login done once by
// hand survives across runs. Login cannot be scripted: server/api/login.post.ts
// only mints a session after the upstream LikeCoin API validates a real
// personal_sign signature, so there is nothing to forge locally.
const PROFILE_DIR = process.env.PROFILE_DIR

async function open() {
  const opts = { viewport: { width: 1280, height: 900 }, locale: 'zh-Hant' }
  let browser, context
  if (PROFILE_DIR) {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'chrome', headless: !HEADED, ...opts,
    })
    browser = context
  }
  else {
    browser = await chromium.launch({ channel: 'chrome', headless: !HEADED })
    context = await browser.newContext(opts)
  }
  const page = context.pages()[0] || await context.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`.slice(0, 300)))
  return { browser, page, errors }
}

// Never use waitUntil:'networkidle' here — HMR/analytics sockets keep the
// network busy forever and the navigation times out.
async function go(page, path, waitSelector, settle = true) {
  const url = path.startsWith('http') ? path : BASE + path
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 30000, state: 'visible' })
  }
  else {
    // The cheap load-state wait lets client-side redirects (locale, guards)
    // resolve; the fixed paint sleep is the expensive part `settle` gates off.
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {})
    if (settle) await page.waitForTimeout(2500) // let client-side fetches paint
  }
  return res
}

async function shot(page, name) {
  const file = name.startsWith('/') ? name : resolve(OUT_DIR, `${name}.png`)
  mkdirSync(dirname(file), { recursive: true })
  await page.screenshot({ path: file, fullPage: false })
  console.log(`screenshot: ${file}`)
  return file
}

function report(page, errors) {
  console.log(`url: ${page.url()}`)
  if (errors.length) {
    console.log(`console errors (${errors.length}):`)
    for (const e of errors.slice(0, 10)) console.log(`  - ${e}`)
  }
  else { console.log('console errors: none') }
}

const [cmd, ...rest] = process.argv.slice(2)
const VALUE_FLAGS = new Set(['--wait', '--out'])
const flag = (n) => {
  const i = rest.indexOf(n)
  return i === -1 ? undefined : rest[i + 1]
}
// Only value-taking flags consume the next token; a boolean flag like --mobile
// must not swallow the positional that follows it.
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.has(rest[i - 1])))

if (!cmd || cmd === 'help') {
  usage()
  process.exit(0)
}

const { browser, page, errors } = await open()
try {
  if (cmd === 'shot') {
    const path = positional[0] || '/'
    if (rest.includes('--mobile')) await page.setViewportSize({ width: 390, height: 844 })
    const res = await go(page, path, flag('--wait'))
    console.log(`status: ${res?.status()}`)
    await shot(page, flag('--out') || `shot-${path.replace(/\W+/g, '_') || 'root'}`)
    report(page, errors)
  }

  else if (cmd === 'text') {
    await go(page, positional[0] || '/', flag('--wait'))
    console.log((await page.locator('body').innerText()).slice(0, 3000))
    report(page, errors)
  }

  else if (cmd === 'flow-store') {
    // Product links are <a href="/store/<nftClassId>"> cards on the home grid.
    const cardSelector = 'a[href*="/store/"]'
    await go(page, '/', cardSelector)
    const cards = page.locator(cardSelector)
    const n = await cards.count()
    console.log(`product cards on home: ${n}`)
    await shot(page, 'flow-store-home')
    const href = await cards.first().getAttribute('href')
    console.log(`opening: ${href}`)
    await cards.first().click()
    // Match the product path specifically — /store/ alone also matches the
    // index we are navigating away from, so the wait would resolve instantly.
    await page.waitForURL(/\/store\/0x[0-9a-fA-F]+/, { timeout: 30000 })
    await page.waitForTimeout(3000)
    await shot(page, 'flow-store-product')
    console.log(`product title: ${await page.title()}`)
    report(page, errors)
  }

  else if (cmd === 'routes') {
    const paths = ['/', '/store', '/shelf', '/pricing', '/about', '/account', '/reader/pdf', '/reader/epub']
    for (const p of paths) {
      errors.length = 0
      let status = 'ERR'
      try {
        status = (await go(page, p, undefined, false))?.status()
      }
      catch (e) {
        status = e.name
      }
      const landed = page.url().replace(BASE, '')
      const redirect = landed.split('?')[0] !== p ? ` -> ${landed}` : ''
      console.log(`${String(status).padEnd(6)} ${p.padEnd(14)}${redirect}  errors=${errors.length}`)
    }
  }

  else if (cmd === 'repl') {
    console.log('repl ready. commands: goto|click|key|eval|text|ss|url|quit')
    const rl = (await import('node:readline')).createInterface({ input: process.stdin })
    for await (const line of rl) {
      const [c, ...a] = line.trim().split(/\s+/)
      const arg = a.join(' ')
      try {
        if (!c) continue
        else if (c === 'goto') {
          const r = await go(page, arg)
          console.log(`ok ${r?.status()} ${page.url()}`)
        }
        else if (c === 'click') {
          await page.click(arg, { timeout: 15000 })
          await page.waitForTimeout(1200)
          console.log(`ok ${page.url()}`)
        }
        else if (c === 'key') {
          await page.keyboard.press(arg)
          await page.waitForTimeout(800)
          console.log('ok')
        }
        else if (c === 'eval') console.log(JSON.stringify(await page.evaluate(arg)))
        else if (c === 'text') console.log((await page.locator(arg).first().innerText()).slice(0, 2000))
        else if (c === 'ss') await shot(page, arg || 'repl')
        else if (c === 'url') console.log(page.url())
        else if (c === 'quit') break
        else console.log(`unknown: ${c}`)
      }
      catch (e) { console.log(`ERR ${e.message.split('\n')[0]}`) }
    }
  }

  else {
    usage()
    process.exitCode = 1
  }
}
finally {
  await browser.close()
}
