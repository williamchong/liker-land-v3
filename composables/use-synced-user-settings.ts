import type { UserSettingsData, UserSettingKey } from '~/types/user-settings'

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

  const state = computed({
    get: () => {
      const settings = userSettingsStore.getSettings()
      if (settings && key in settings) {
        return settings[key as keyof UserSettingsData] as T
      }
      return defaultValue
    },
    set: (newValue) => {
      userSettingsStore.queueUpdate(key, newValue)
    },
  })

  watch(hasLoggedIn, (isLoggedIn) => {
    if (isLoggedIn && !userSettingsStore.isInitialized()) {
      userSettingsStore.ensureInitialized()
    }
  })

  onMounted(() => {
    if (hasLoggedIn.value && !userSettingsStore.isInitialized()) {
      userSettingsStore.ensureInitialized()
    }
  })

  onBeforeUnmount(() => {
    userSettingsStore.flushBatch()
  })

  return state as Ref<T>
}
