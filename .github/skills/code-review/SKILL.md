---
name: code-review
description: Review criteria for 3ook.com pull requests — the repo-specific bug classes, conventions, and known-noise exclusions that a diff alone does not reveal. Use when reviewing any pull request in this repository.
---

# Reviewing 3ook.com

Nuxt 4 PWA + Nitro server, deployed to Base mainnet/testnet, and also served
inside an iOS/Android React Native WebView shell. Project-wide guidance lives in
[`AGENTS.md`](../../../AGENTS.md); this file covers what matters **when reviewing**.

Prioritize the bug classes in section 1 — they have repeatedly reached
`develop`. Conventions (section 2) are worth a comment only when the diff
introduces a new violation. Section 3 is known noise: do not report it.

## 1. Bug classes that actually ship here

### State outliving the owner it was scoped to

The single most recurring defect in this repo. Reader position, user settings,
locale, currency, and region are all shared/persisted state keyed to a session
or a document — and the swap case is routinely missed.

Flag when a diff:

- Persists or restores reader state without re-validating it against the
  **currently loaded** document (a saved page number from book A applied to
  book B, or applied before parsing completes).
- Applies account-scoped preferences without invalidating **in-flight** work
  from a previous session. An `await` that resolves after logout, or after a
  second account logs in, will write account A's values over account B's.
- Retries a session-bound write. `ofetch` retries reuse the browser's *current*
  cookie, so a retry that outlives a logout applies the old account's payload to
  the new one. Session-bound writes should not silently retry.
- Adds a `watch` that guards on readiness once but never re-runs when readiness
  flips (`if (!isReady) return` in a watcher that does not watch `isReady`).

Ask: *what happens if the user swaps account or document while this is pending?*

### Native WebView paths

The app runs inside a React Native shell ([likecoin/3ook-com-app](https://github.com/likecoin/3ook-com-app));
helpers are in `app/utils/native-bridge.ts` (`isNativeWebView`,
`isNativeFeatureSupported`, `postToNative`, `requestNative*`, `isNativeIntercomAvailable`).
Bugs here surface **only in production native builds** — CI cannot catch them.

Flag when a diff changes UI, navigation, downloads, external links, or a
third-party SDK (Intercom, review prompts, caches) and handles only the web
path. The `requestNative*` helpers already guard themselves — flag a raw
`postToNative()` that is not behind an `isNativeWebView()` /
`isNativeFeatureSupported()` check, and ask for a web fallback only where one is
meaningful (a store-review prompt has no web equivalent; a download does).

Also check universal-link coverage: new user-facing server routes generally need
matching entries in `public/.well-known/apple-app-site-association`. A route
added to the app but not excluded there can be intercepted by the native app
instead of reaching the server. Partial coverage is the tell — if a sibling
route (`/s/*`) is listed and the new one (`/l/*`) is not, say so.

### Server input validation

`server/api/` endpoints validate input via Valibot schemas in `server/schemas/`
(or `shared/schemas/` when the client reuses them). Flag a new or modified
endpoint that reads `body`/`query`/route params without a schema, or that adds
a field to a validated payload without extending the schema.

### Configuration that must move together

These pair with code changes and are easy to forget:

- **CSP** — a new external host (script, image, connect, frame) needs its
  allowlist updated in the `nuxt-security` config in `nuxt.config.ts`.
- **Env vars** — must be added to `.env.example` *and* both
  `apphosting.mainnet.yaml` and `apphosting.sepolia.yaml`, **sorted
  alphabetically**. Read them via `useRuntimeConfig()` — never hardcode.
- **Testnet/mainnet** — behavior keyed to `IS_TESTNET` should work on both.
  Flag hardcoded chain IDs, contract addresses, or API hosts.
- **i18n** — user-facing strings belong in `i18n/locales/*.json` with a **flat,
  sorted** key structure. A key added to `en.json` but not `zh-Hant.json` (or
  vice versa) is a defect. In components use `useI18n()`, `useLocalePath()`,
  `useLocaleRoute()` — not raw paths.

## 2. Conventions

`AGENTS.md` is the source of truth for these and wins if the two ever disagree.
Repeated here only as a review checklist — comment on code the diff introduces
or modifies, not on surrounding files.

- **Naming** — acronyms uppercase (`bookURL`, `isPDF`), abbreviations camelCase
  (`bookId`); booleans prefixed `is`/`has`/`should`/`must`; functions start with
  a verb. `fetch*` is async, `get*` is a synchronous getter — a `get*` returning
  a promise is a naming bug.
- **Templates** — `v-text` over mustache interpolation; Nuxt UI semantic colors
  (`text-muted`, `bg-elevated`) over hardcoded palette classes, which break
  theming; Material Symbols rounded icons; `UModal` via its `title`/`description`
  props and `:ui`, not extra wrapper divs.
- **Comments** — at most 3 lines, broken at punctuation. Flag commented-out code
  and comments that restate the code.

Two review-specific points `AGENTS.md` does not cover:

- Tailwind `transition-[…]` lists must name the CSS property actually animated.
  This is Tailwind 4, where `scale-*`/`rotate-*`/`translate-*` set the
  individual transform properties — so the list needs `scale`, not `transform`.
- Tests live in `test/unit/` (Vitest, `@nuxt/test-utils`, `happy-dom`). There is
  no e2e suite — do not ask for e2e coverage. New pure utilities in
  `shared/utils/` or `app/utils/` should come with unit tests.

## 3. Do not flag

- The 4 `v-html` warnings from `npm run lint` — known and expected.
- `NODE_OPTIONS=--max-old-space-size=8192` on builds — required, builds OOM
  without it.
- Sentry warnings about a missing auth token — non-blocking by design.
- Font-provider warnings during `npm run dev` in sandboxed environments — local
  icon collections are the intended fallback.
- Gitmoji-prefixed commit messages (💬, 🚸, 📈) — the house convention.
- `CLAUDE.md` being a symlink to `AGENTS.md` — intentional.
- Formatting, import order, and quoting — ESLint (`@nuxt/eslint`, stylistic
  rules) owns these and runs in CI. Reviewing them is pure noise.
- Server-side token persistence being incomplete — a known work in progress.

## Reporting

Lead with the section-1 findings; they are the ones worth blocking on. For each,
state the concrete failing sequence (which account, which document, which
order), not just the rule that was broken. Prefer no comment over a speculative
one — a review that flags three real bugs is more useful than one that flags
thirty possibilities.
