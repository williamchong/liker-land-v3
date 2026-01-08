import { useDebounceFn } from '@vueuse/core'
import type { BookSettingsData } from '~/types/book-settings'

interface BookSettingsEntry {
  data: BookSettingsData
  fetchedAt: number
}

export const useBookSettingsStore = defineStore('book-settings', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const settingsMap = ref<Record<string, BookSettingsEntry>>({})
  const fetchPromisesMap = ref<Record<string, Promise<BookSettingsData>>>({})

  // Batch update queues per nftClassId
  const batchQueuesMap = ref<Record<string, Map<string, unknown>>>({})
  const debouncedFlushFunctionsMap = ref<Record<string, ReturnType<typeof useDebounceFn>>>({})

  function getKey(nftClassId: string): string {
    return nftClassId.toLowerCase()
  }

  function isInitialized(nftClassId: string): boolean {
    const key = getKey(nftClassId)
    return key in settingsMap.value
  }

  async function fetchSettings(nftClassId: string): Promise<BookSettingsData> {
    const key = getKey(nftClassId)

    if (fetchPromisesMap.value[key]) {
      return fetchPromisesMap.value[key]
    }

    const fetchPromise = $fetch<BookSettingsData>(`/api/books/${nftClassId}/settings`)
      .then((settings) => {
        settingsMap.value[key] = {
          data: settings,
          fetchedAt: Date.now(),
        }
        return settings
      })
      .catch((error) => {
        console.warn(`Failed to fetch book settings for ${nftClassId}:`, error)
        // Store empty entry to mark as initialized (prevents retry)
        settingsMap.value[key] = {
          data: {} as BookSettingsData,
          fetchedAt: Date.now(),
        }
        throw error
      })
      .finally(() => {
        const { [key]: _, ...rest } = fetchPromisesMap.value
        fetchPromisesMap.value = rest
      })

    fetchPromisesMap.value[key] = fetchPromise
    return fetchPromise
  }

  async function ensureInitialized(nftClassId: string): Promise<void> {
    if (!hasLoggedIn.value) return
    if (isInitialized(nftClassId)) return

    try {
      await fetchSettings(nftClassId)
    }
    catch {
      // Error already logged in fetchSettings
    }
  }

  function getSettings(nftClassId: string): BookSettingsData | undefined {
    const key = getKey(nftClassId)
    return settingsMap.value[key]?.data
  }

  function clearSettings(nftClassId: string) {
    const key = getKey(nftClassId)
    const { [key]: _, ...settingsRest } = settingsMap.value
    settingsMap.value = settingsRest
    const { [key]: __, ...fetchRest } = fetchPromisesMap.value
    fetchPromisesMap.value = fetchRest
  }

  function addToBatch(nftClassId: string, dbKey: string, value: unknown) {
    const key = getKey(nftClassId)
    if (!batchQueuesMap.value[key]) {
      batchQueuesMap.value[key] = new Map()
    }
    batchQueuesMap.value[key].set(dbKey, value)
  }

  async function flushBatch(nftClassId: string) {
    if (!hasLoggedIn.value) return

    const key = getKey(nftClassId)
    const queue = batchQueuesMap.value[key]
    if (!queue || queue.size === 0) return

    // Copy and clear the queue
    const updates = Object.fromEntries(queue.entries())
    queue.clear()

    try {
      await $fetch(`/api/books/${nftClassId}/settings`, {
        method: 'POST',
        body: updates,
      })
    }
    catch (error) {
      console.warn(`Failed to sync book settings for ${nftClassId}:`, error)
    }
  }

  function getDebouncedFlush(nftClassId: string) {
    const key = getKey(nftClassId)
    if (!debouncedFlushFunctionsMap.value[key]) {
      debouncedFlushFunctionsMap.value[key] = useDebounceFn(
        () => flushBatch(nftClassId),
        1000,
      )
    }
    return debouncedFlushFunctionsMap.value[key]
  }

  function queueUpdate(nftClassId: string, dbKey: string, value: unknown) {
    addToBatch(nftClassId, dbKey, value)
    const debouncedFlush = getDebouncedFlush(nftClassId)
    debouncedFlush()
  }

  return {
    fetchSettings,
    getSettings,
    clearSettings,
    ensureInitialized,
    isInitialized,
    queueUpdate,
    flushBatch,
  }
})
