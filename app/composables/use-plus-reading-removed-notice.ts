// The attribution a rescue click carries, whichever surface caught the removal.
const PLUS_READING_REMOVED_LL_MEDIUM = 'library-removed'
const PLUS_READING_REMOVED_SOURCES = ['shelf', 'reader'] as const

type PlusReadingRemovedSource = typeof PLUS_READING_REMOVED_SOURCES[number]

/**
 * The notice for a book the publisher pulled out of the Plus library: the
 * borrow ends immediately, so both surfaces that catch it — the shelf's locked
 * cover and the reader's entry gate — say what happened and send the reader to
 * the product page, where buying is the way back in. Returns that page's
 * attribution so the rescue click is tagged identically from either surface.
 */
export function usePlusReadingRemovedNotice() {
  const { t: $t } = useI18n()
  const toast = useToast()
  const getRouteQuery = useRouteQuery()
  // The reader's gate also rejects during SSR, where the redirect replaces the
  // document before any toast can show — so the notice fires on the landing
  // page instead. True only for the first render of an SSR response, so a
  // client-side reject that already toasted never repeats it there, and neither
  // does a later page inheriting the tags from `middleware/query.global.ts`.
  const isSSRLanding = import.meta.client && useNuxtApp().isHydrating

  function showNotice(nftClassId: string, source: PlusReadingRemovedSource) {
    useLogEvent('plus_reading_removed_notice', {
      nft_class_id: nftClassId,
      source,
    })
    toast.add({
      title: $t('bookshelf_plus_reading_removed_toast_title'),
      description: $t('bookshelf_plus_reading_removed_toast_description'),
      icon: 'i-3ook-com-library-outline-rounded',
      color: 'neutral',
    })
  }

  function notifyPlusReadingRemoved(
    { nftClassId, source }: { nftClassId: string, source: PlusReadingRemovedSource },
  ) {
    if (import.meta.client) {
      showNotice(nftClassId, source)
    }
    return { llMedium: PLUS_READING_REMOVED_LL_MEDIUM, llSource: source }
  }

  // The product page's half of the pair: raises the notice the SSR reject could
  // not, reading back the surface it tagged the redirect with.
  function catchPlusReadingRemovedRedirect({ nftClassId }: { nftClassId: string }) {
    if (!isSSRLanding) return
    if (getRouteQuery('ll_medium') !== PLUS_READING_REMOVED_LL_MEDIUM) return
    const source = getRouteQuery('ll_source') as PlusReadingRemovedSource
    if (!PLUS_READING_REMOVED_SOURCES.includes(source)) return
    showNotice(nftClassId, source)
  }

  return { notifyPlusReadingRemoved, catchPlusReadingRemovedRedirect }
}
