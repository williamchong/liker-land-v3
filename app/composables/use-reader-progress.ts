import type { ReaderCacheKeySuffix } from '~/utils/reader'

export function useReaderProgress({
  nftClassId,
  bookProgressKeyPrefix,
}: {
  nftClassId: string
  bookProgressKeyPrefix: string
}) {
  const bookshelfStore = useBookshelfStore()
  const bookSettingsStore = useBookSettingsStore()

  function getProgressKeyWithSuffix(suffix: ReaderCacheKeySuffix) {
    return getReaderCacheKeyWithSuffix(bookProgressKeyPrefix, suffix)
  }

  const readingProgress = useSyncedBookSettings({
    nftClassId,
    key: 'progress',
    defaultValue: 0,
  })
  const lastOpenedTime = useSyncedBookSettings({
    nftClassId,
    key: 'lastOpenedTime',
    defaultValue: 0,
  })

  onMounted(() => {
    lastOpenedTime.value = Date.now()
  })

  if (import.meta.client) {
    useEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        bookSettingsStore.flushBatch(nftClassId)
      }
    })
  }

  onBeforeUnmount(() => {
    bookshelfStore.updateProgress(
      nftClassId,
      readingProgress.value,
      lastOpenedTime.value,
    )
    // updateProgress only schedules a debounced (1s) flush. Force it out
    // now so the final progress / lastOpenedTime reaches the server
    // immediately on unmount, syncing to the shelf and other devices
    // without a 1s lag.
    bookSettingsStore.flushBatch(nftClassId)
  })

  return {
    readingProgress,
    lastOpenedTime,
    getProgressKeyWithSuffix,
  }
}
