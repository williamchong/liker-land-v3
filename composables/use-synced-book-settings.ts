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
  const stateKey = `book-settings:${nftClassId.toLowerCase()}:${namespacePrefix}${String(key)}`
  const dbKey = `${namespacePrefix}${String(key)}`

  const state = useState<T>(stateKey, () => defaultValue)

  // Load value from server after initialization
  async function loadFromServer() {
    await bookSettingsStore.ensureInitialized(nftClassId)
    const settings = bookSettingsStore.getSettings(nftClassId)
    if (settings && dbKey in settings) {
      const apiValue = settings[dbKey as keyof BookSettingsData]
      state.value = apiValue as T
    }
  }

  watch(state, (newValue) => {
    if (bookSettingsStore.isInitialized(nftClassId)) {
      bookSettingsStore.queueUpdate(nftClassId, dbKey, newValue)
    }
  })

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

  return state
}
