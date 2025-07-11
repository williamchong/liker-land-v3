import { TTSPlayerModal } from '#components'
import type { TTSPlayerModalProps } from '~/components/TTSPlayerModal.props'

interface TTSSegment {
  id: string
  text: string
  index: number
}

interface TTSPlayerOptions {
  nftClassId?: string
}

export function useTTSPlayerModal(options: TTSPlayerOptions = {}) {
  const { user } = useUserSession()
  const subscription = useSubscription()
  const ttsSegments = ref<TTSSegment[]>([])
  const bookInfo = useBookInfo({ nftClassId: options.nftClassId })
  const bookCoverSrc = computed(() =>
    getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }),
  )

  const ttsPlayerModalProps = computed<TTSPlayerModalProps>(() => ({
    bookTitle: bookInfo.name.value,
    bookCoverSrc: bookCoverSrc.value,
    bookAuthorName: bookInfo.authorName.value,
    nftClassId: options.nftClassId,
    segment: ttsSegments.value,
  }))

  const overlay = useOverlay()
  const modal = overlay.create(TTSPlayerModal, {
    props: ttsPlayerModalProps.value,
  })

  function setTTSSegments(elements: TTSSegment[]) {
    ttsSegments.value = elements
  }

  function openPlayer() {
    if (!user.value?.isLikerPlus) {
      subscription.openPaywallModal()
      return
    }
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
