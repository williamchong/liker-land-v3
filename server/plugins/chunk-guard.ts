import { CHUNK_GUARD_SCRIPT } from '~~/shared/utils/chunk-guard'

// Append the pre-boot chunk-error guard as a classic inline <head> script on
// every SSR document. The Nuxt entry is a deferred module script, so this runs
// first and can catch the entry chunk itself failing to load — the one failure
// plugins/chunk-error.client.ts can never see. Appended (not prepended) so the
// charset meta stays within the first bytes of the document.
const GUARD_TAG = `<script>${CHUNK_GUARD_SCRIPT}</script>`

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    html.head.push(GUARD_TAG)
  })
})
