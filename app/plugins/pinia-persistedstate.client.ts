import { createPersistedState } from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  // The 'nft' key belonged to the deleted nft Pinia store; its data now lives
  // in the Pinia Colada query cache under its own persisted key. Guard the
  // access: storage can throw in sandboxed WebView/private-mode contexts, and
  // an unhandled throw here would abort plugin init and block app boot.
  try {
    localStorage.removeItem('nft')
  }
  catch (error) {
    console.warn('[pinia-persistedstate] failed to remove legacy nft cache', error)
  }

  const pinia = nuxtApp.$pinia as import('pinia').Pinia
  pinia.use(createPersistedState({ storage: createDebouncedStorage(localStorage) }))
})
