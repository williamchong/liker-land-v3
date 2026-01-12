import type { BookSettingsData, BookSettingKey } from '~/types/book-settings'

interface UseSyncedBookSettingsOptions<T> {
  nftClassId: string
  key: BookSettingKey
  defaultValue: T
  namespace?: string
}

export function useSyncedBookSettings<T>({
  nftClassId,
  key,
  defaultValue,
  namespace,
}: UseSyncedBookSettingsOptions<T>): Ref<T> {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const bookSettingsStore = useBookSettingsStore()

  const namespacePrefix = namespace ? `${namespace}-` : ''
  const dbKey = `${namespacePrefix}${String(key)}`

  const state = computed({
    get: () => {
      const settings = bookSettingsStore.getSettings(nftClassId)
      if (settings && dbKey in settings) {
        return settings[dbKey as keyof BookSettingsData] as T
      }
      return defaultValue
    },
    set: (newValue) => {
      if (bookSettingsStore.isInitialized(nftClassId)) {
        bookSettingsStore.queueUpdate(nftClassId, dbKey, newValue)
      }
    },
  })

  async function loadFromServer() {
    await bookSettingsStore.ensureInitialized(nftClassId)
  }

  watch(hasLoggedIn, (isLoggedIn) => {
    if (isLoggedIn && !bookSettingsStore.isInitialized(nftClassId)) {
      loadFromServer()
    }
  })

  onMounted(() => {
    if (hasLoggedIn.value && !bookSettingsStore.isInitialized(nftClassId)) {
      loadFromServer()
    }
  })

  onBeforeUnmount(() => {
    if (bookSettingsStore.isInitialized(nftClassId)) {
      bookSettingsStore.flushBatch(nftClassId)
    }
  })

  return state as Ref<T>
}
