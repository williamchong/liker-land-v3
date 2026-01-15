import type { UserSettingsData } from '~/types/user-settings'
import type { UserSettingKey } from '~/shared/types/user-settings'

interface UseSyncedUserSettingsOptions<T> {
  key: UserSettingKey
  defaultValue: T
}

export function useSyncedUserSettings<T>({
  key,
  defaultValue,
}: UseSyncedUserSettingsOptions<T>): Ref<T> {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const userSettingsStore = useUserSettingsStore()

  const localState = ref<T>(defaultValue)

  function ensureInitialized() {
    if (hasLoggedIn.value && !userSettingsStore.isInitialized()) {
      userSettingsStore.ensureInitialized()
    }
  }

  function syncFromStore() {
    const settings = userSettingsStore.getSettings()
    if (settings && key in settings) {
      localState.value = settings[key as keyof UserSettingsData] as T
    }
  }

  const state = computed({
    get: () => localState.value,
    set: (newValue) => {
      localState.value = newValue
      if (!hasLoggedIn.value) {
        return
      }
      userSettingsStore.queueUpdate(key, newValue)
    },
  })

  watch(() => userSettingsStore.getSettings(), syncFromStore, { deep: true })

  watch(hasLoggedIn, (isLoggedIn, wasLoggedIn) => {
    if (!isLoggedIn && wasLoggedIn) {
      userSettingsStore.flushBatch()
      userSettingsStore.$reset()
      localState.value = defaultValue
    }
    else {
      ensureInitialized()
    }
  })

  onMounted(() => {
    if (hasLoggedIn.value && !userSettingsStore.isInitialized()) {
      ensureInitialized()
    }
    else {
      syncFromStore()
    }
  })

  onBeforeUnmount(() => {
    userSettingsStore.flushBatch()
  })

  return state as Ref<T>
}
