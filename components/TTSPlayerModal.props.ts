interface TTSSegment {
  id: string
  text: string
  index: number
}

export interface TTSPlayerModalProps {
  isModalityOn?: boolean
  bookTitle?: string
  sectionTitle?: string
  coverImage?: string
  segment?: TTSSegment[] | []
  bookCoverSrc?: string
  bookAuthorName?: string | undefined
  nftClassId?: string
  onOpen?: () => void
  onClose?: () => void
}
