import { createPersistedState } from 'pinia-plugin-persistedstate'

// Coalesce rapid setItem calls so a burst of Pinia mutations (e.g., 100 books
// pushed inside a single fetch loop) doesn't trigger 100 JSON.stringify+write
// round-trips on the main thread. Reads return the pending value so hydration
// order stays correct.
function createDebouncedStorage(base: Storage, delayMs = 300): Storage {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const pending = new Map<string, string>()
  return {
    ...base,
    length: base.length,
    clear: () => base.clear(),
    key: index => base.key(index),
    getItem: key => pending.get(key) ?? base.getItem(key),
    setItem: (key, value) => {
      pending.set(key, value)
      const existing = timers.get(key)
      if (existing) clearTimeout(existing)
      timers.set(key, setTimeout(() => {
        base.setItem(key, value)
        pending.delete(key)
        timers.delete(key)
      }, delayMs))
    },
    removeItem: (key) => {
      const existing = timers.get(key)
      if (existing) clearTimeout(existing)
      pending.delete(key)
      timers.delete(key)
      base.removeItem(key)
    },
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = nuxtApp.$pinia as import('pinia').Pinia
  pinia.use(createPersistedState({ storage: createDebouncedStorage(localStorage) }))
})
