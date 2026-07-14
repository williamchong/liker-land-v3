export function useBookFileURLWithCORS() {
  const config = useRuntimeConfig()
  return function getBookFileURLWithCORS({
    nftClassId,
    nftId,
    fileIndex,
    isCustomMessageEnabled,
    isPreview = false,
  }: {
    nftClassId: string
    nftId: string | undefined
    fileIndex: string | number
    isCustomMessageEnabled: boolean
    isPreview?: boolean
  }): string {
    const url = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
    url.searchParams.set('class_id', nftClassId)
    // The preview variant is a distinct URL serving a server-truncated file;
    // it must not carry nft_id or custom_message=1 (the server 400s on either).
    if (nftId && !isPreview) url.searchParams.set('nft_id', nftId)
    url.searchParams.set('index', String(fileIndex))
    url.searchParams.set('custom_message', isCustomMessageEnabled && nftId && !isPreview ? '1' : '0')
    if (isPreview) url.searchParams.set('preview', '1')
    return url.toString()
  }
}
