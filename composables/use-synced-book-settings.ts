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

  const localState = ref<T>(defaultValue)

  function syncFromStore() {
    const settings = bookSettingsStore.getSettings(nftClassId)
    if (settings && dbKey in settings) {
      localState.value = settings[dbKey as keyof BookSettingsData] as T
    }
  }

  const state = computed({
    get: () => localState.value,
    set: (newValue) => {
      localState.value = newValue
      if (bookSettingsStore.isInitialized(nftClassId)) {
        bookSettingsStore.queueUpdate(nftClassId, dbKey, newValue)
      }
    },
  })

  async function loadFromServer() {
    await bookSettingsStore.ensureInitialized(nftClassId)
    syncFromStore()
  }

  watch(() => bookSettingsStore.getSettings(nftClassId), syncFromStore, { deep: true })

  watch(hasLoggedIn, (isLoggedIn) => {
    if (isLoggedIn && !bookSettingsStore.isInitialized(nftClassId)) {
      loadFromServer()
    }
  })

  onMounted(() => {
    if (hasLoggedIn.value && !bookSettingsStore.isInitialized(nftClassId)) {
      loadFromServer()
    }
    else {
      syncFromStore()
    }
  })

  onBeforeUnmount(() => {
    if (bookSettingsStore.isInitialized(nftClassId)) {
      bookSettingsStore.flushBatch(nftClassId)
    }
  })

  return state as Ref<T>
}
