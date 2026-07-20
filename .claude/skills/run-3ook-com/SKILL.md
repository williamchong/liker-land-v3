---
name: run-3ook-com
description: Run, launch, drive, and screenshot the 3ook.com Nuxt app locally. Use when asked to start the dev server, take a screenshot of a page, verify a UI change in the real running app, check a route for console errors, or drive a user flow end-to-end in a browser.
---

# Run 3ook.com

Nuxt 4 PWA. Driven headlessly by `.claude/skills/run-3ook-com/driver.mjs` —
a Playwright CLI that talks to an already-running `npm run dev` server.

All paths below are relative to the repo root (the directory containing `package.json`).
**Run the driver from the repo root** — it imports `playwright-core` from the
project's `node_modules` and will not resolve from anywhere else.

## Prerequisites

Verify these prerequisites locally (they may vary by machine):

- Node 24 (`.node-version`), `npm install` done.
- `playwright-core` — present transitively in `node_modules`. The standalone
  `playwright` package is **not** installed and is not needed.
- Google Chrome at `/Applications/Google Chrome.app`. The driver launches it
  via `channel: 'chrome'`, so there is no `npx playwright install` step.
- `.env` exists and points at **Sepolia testnet** (the UI shows a `SEPOLIA`
  badge). `minimaxAPIKey`, `minimaxGroupId`, and `airtableAPISecret` are unset
  locally — see Gotchas.

## Start the dev server

Takes ~40s to first serve. Leave it running in the background:

```bash
npm run dev > /tmp/3ook-dev.log 2>&1 &
sleep 45 && tail -5 /tmp/3ook-dev.log
```

Ready when the log shows `➜ Local: http://localhost:3000/`.

## Run (agent path)

```bash
node .claude/skills/run-3ook-com/driver.mjs help
```

Screenshots land in `/tmp/3ook-shots/` (override with `SHOT_DIR`).
Always `Read` the PNG afterwards — a 200 status here does not mean the page painted.

### Screenshot a route

```bash
node .claude/skills/run-3ook-com/driver.mjs shot /store --out store
node .claude/skills/run-3ook-com/driver.mjs shot /shelf --mobile --out shelf-mobile
```

`--mobile` uses a 390×844 viewport. `--wait <selector>` blocks until a selector
is visible instead of the default 2.5s settle. Prints status, final URL, and
filtered console errors.

### Dump page text (faster than a screenshot for copy checks)

```bash
node .claude/skills/run-3ook-com/driver.mjs text /pricing
```

### Sweep every top-level route

```bash
node .claude/skills/run-3ook-com/driver.mjs routes
```

Verified output this session — note the redirects, they are expected:

```
200    /              -> /store  errors=0
200    /store          errors=0
200    /shelf          errors=0
200    /pricing       -> /member  errors=0
200    /about          errors=1
200    /account        errors=0
200    /reader/pdf    -> /account  errors=0
200    /reader/epub   -> /account  errors=0
```

`routes` skips the paint settle for speed (~3s for all 8), so it reports the
URL right after the server redirect — before the client-side locale prefix
(`/en`) and tag query settle. The `shot`/`text`/`flow-store` commands do settle
and show the full `/en/…?tag=…` URL. Error counts are noisy (`/about` varies
run to run); treat a jump from 0 as the signal, not the exact number.

### Real user flow: browse store → open a product

```bash
node .claude/skills/run-3ook-com/driver.mjs flow-store
```

Verified: 20–24 product cards on the grid, clicks the first, lands on
`/en/store/0x9cfb…` and renders the full product page (cover, price,
Buy/Borrow, description).

### Interactive REPL

Pipe commands on stdin — one per line:

```bash
printf 'goto /store\nclick a[href*="/store/0x"]\nss product\ntext h1\nquit\n' \
  | node .claude/skills/run-3ook-com/driver.mjs repl
```

Commands: `goto <path>`, `click <selector>`, `key <Key>`, `eval <js>`,
`text <selector>`, `ss <name>`, `url`, `quit`.

### Logged-in pages (reader, shelf contents, account)

`/reader/pdf` and `/reader/epub` redirect to `/account` when logged out, and
**login cannot be scripted** — `server/api/login.post.ts` only mints a session
after the upstream LikeCoin API validates a real wallet `personal_sign`
signature. There is no local bypass.

Workaround — log in by hand once into a persistent Chrome profile, then reuse it:

```bash
# 1. One-time, human: a real Chrome window opens; complete the wallet/email login.
#    The env vars must sit on `node`, not on `printf`, or they are lost.
printf 'goto /account\n' | PROFILE_DIR=/tmp/3ook-profile HEADED=1 \
  node .claude/skills/run-3ook-com/driver.mjs repl
# (leave the REPL open while logging in, then type: quit)

# 2. Every later run reuses that session, headless:
PROFILE_DIR=/tmp/3ook-profile \
  node .claude/skills/run-3ook-com/driver.mjs shot /reader/pdf --out reader
```

Profile persistence is verified: a value written to `localStorage` in one run
reads back in a separate later run.

## Run (human path)

`npm run dev`, then open <http://localhost:3000>. Same server the driver uses —
you can run the driver against a dev server a human already started.

## Test

```bash
npm run test:run   # 20 files, 226 tests, ~6s. All passing this session.
npm run lint       # 4 known v-html warnings are expected
npm run typecheck  # ~30s
```

## Gotchas

- **Never use `waitUntil: 'networkidle'`.** HMR websockets, analytics, and
  wallet connectors keep sockets open permanently — a `networkidle` navigation
  times out at 90s even though the page rendered fine seconds earlier. The
  driver uses `domcontentloaded` + an explicit wait; keep it that way.
- **The driver must run from the repo root.** `playwright-core` is only
  reachable via the project's `node_modules`; running the script from `/tmp`
  fails with `ERR_MODULE_NOT_FOUND: playwright-core`.
- **Routes may gain an `/en` locale prefix.** Browser language detection is
  off (`detectBrowserLanguage: false`); locale comes from an explicit
  `/<locale>` prefix, stored locale (`user_locale` / user settings), or geo
  detection (`useAutoLocale`), which falls back to `en`. A fresh headless
  profile therefore requests `/store` and lands on `/en/store`, while zh-Hant
  (the default locale) stays unprefixed. Assertions on the exact path must
  account for the optional locale segment.
- **`/pricing` redirects to `/member`.** Not a bug.
- **Dev CSP blocks book covers.** `ar://…` and `https://gateway.irys.xyz/…`
  images are rejected by the `img-src` directive, so grid thumbnails render as
  grey placeholder icons and titles show as `Free #1`, `Free #2`… The *product
  detail* page renders its cover fine. Do not chase this as a UI regression.
  The driver filters these out of its console-error report.
- **Store grid card count is nondeterministic** — 24 on one run, 20 on the
  next. Do not assert an exact count.
- **`Failed to load staking data: ContractFunctionExecutionError`** appears on
  product pages. Local `.env` is Sepolia while the RPC call targets Base
  mainnet. Expected locally; not a regression.
- **A loose URL wait silently no-ops.** `waitForURL(/\/store\//)` resolves
  instantly when you are already on `/en/store`, so a click that never
  navigated still "passes." Match the specific target
  (`/\/store\/0x[0-9a-fA-F]+/`) — this bit the `flow-store` flow.
- **TTS and Airtable CMS are dead locally** (`minimaxAPIKey`,
  `minimaxGroupId`, `airtableAPISecret` unset). The dev server logs
  `WARN [env] Missing optional var: …` at boot and continues.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ERR_MODULE_NOT_FOUND: playwright-core` | You ran the driver from outside the repo. `cd` to the repo root. |
| `page.goto: Timeout 90000ms exceeded … waiting until "networkidle"` | You added `networkidle`. Use `domcontentloaded` + `--wait <selector>`. |
| `browserType.launch: Chromium distribution 'chrome' is not found` | Google Chrome is not installed at the standard macOS path. Install it, or drop `channel: 'chrome'` and run `npx playwright install chromium`. |
| Screenshot shows only nav chrome + empty body | You screenshotted before client-side fetches painted. Pass `--wait 'a[href*="/store/"]'` or an equivalent selector. |
| Reader page screenshots the account/login screen | Not logged in. Use the `PROFILE_DIR` flow above. |
| Port 3000 already in use | A dev server is already running — reuse it, or `lsof -ti:3000 \| xargs kill`. |
