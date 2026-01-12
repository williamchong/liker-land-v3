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

  function ensureInitialized() {
    if (hasLoggedIn.value && !userSettingsStore.isInitialized()) {
      userSettingsStore.ensureInitialized()
    }
  }

  const state = computed({
    get: () => {
      const settings = userSettingsStore.getSettings()
      if (settings && key in settings) {
        return settings[key as keyof UserSettingsData] as T
      }
      return defaultValue
    },
    set: (newValue) => {
      if (!hasLoggedIn.value) {
        return
      }
      userSettingsStore.queueUpdate(key, newValue)
    },
  })

  watch(hasLoggedIn, (isLoggedIn, wasLoggedIn) => {
    if (!isLoggedIn && wasLoggedIn) {
      userSettingsStore.flushBatch()
      userSettingsStore.$reset()
    }
    else {
      ensureInitialized()
    }
  })

  onMounted(() => ensureInitialized())

  onBeforeUnmount(() => {
    userSettingsStore.flushBatch()
  })

  return state as Ref<T>
}
