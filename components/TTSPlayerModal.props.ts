export interface TTSPlayerModalProps {
  bookTitle?: string
  sectionTitle?: string
  segments?: TTSSegment[] | []
  bookCoverSrc?: string
  bookAuthorName?: string | undefined
  nftClassId?: string
  onOpen?: () => void
  onClose?: () => void
}
