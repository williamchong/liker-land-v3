export function useAdultContentSetting() {
  return useSyncedUserSettings<boolean>({
    key: 'isAdultContentEnabled',
    defaultValue: false,
  })
}
