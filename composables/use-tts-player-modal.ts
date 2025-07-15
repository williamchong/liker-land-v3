import { TTSPlayerModal } from '#components'
import type { TTSPlayerModalProps } from '~/components/TTSPlayerModal.props'

interface TTSPlayerOptions {
  nftClassId?: string
  onSegmentChange?: (segment: { id?: string, text?: string, href?: string } | undefined) => void
}

export function useTTSPlayerModal(options: TTSPlayerOptions = {}) {
  const { user } = useUserSession()
  const subscription = useSubscription()
  const ttsSegments = ref<TTSSegment[]>([])
  const startIndex = ref(0)
  const bookInfo = useBookInfo({ nftClassId: options.nftClassId })
  const bookCoverSrc = computed(() =>
    getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }),
  )

  const ttsPlayerModalProps = computed<TTSPlayerModalProps>(() => ({
    bookTitle: bookInfo.name.value,
    bookCoverSrc: bookCoverSrc.value,
    bookAuthorName: bookInfo.authorName.value,
    nftClassId: options.nftClassId,
    segments: ttsSegments.value,
    startIndex: startIndex.value,
    onSegmentChange: options.onSegmentChange,
  }))

  const overlay = useOverlay()
  const modal = overlay.create(TTSPlayerModal, {
    props: ttsPlayerModalProps.value,
  })

  function setTTSSegments(elements: TTSSegment[]) {
    ttsSegments.value = elements
  }

  function openPlayer({ href }: { href?: string } = {}) {
    if (!user.value?.isLikerPlus) {
      subscription.openPaywallModal({
        utmSource: 'epub_reader',
        utmCampaign: options.nftClassId,
        utmMedium: 'tts',
      })
      return
    }
    ttsPlayerModalProps.value.startIndex = href
      ? ttsSegments.value.findIndex(segment => segment.href === href)
      : 0
    modal.open(ttsPlayerModalProps.value)
  }

  function updateTTSPlayerModalProps(
    overrideProps: Partial<TTSPlayerModalProps> = {},
  ) {
    const baseProps = ttsPlayerModalProps.value
    const mergedProps = { ...baseProps, ...overrideProps }
    modal.patch(mergedProps)
  }

  return {
    modal,
    openPlayer,
    updateTTSPlayerModalProps,

    ttsSegments,
    setTTSSegments,
  }
}
