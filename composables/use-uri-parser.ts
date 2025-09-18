export function useURIParser() {
  const config = useRuntimeConfig()

  function normalizeURIToHTTP(url?: string) {
    if (!url) return ''
    const [schema, path] = url.split('://')
    if (schema === 'ar') return `${config.public.arweaveEndpoint}/${path}`
    if (schema === 'ipfs') return `${config.public.ipfsEndpoint}/${path}`
    return url
  }

  function getResizedImageURL(imageURL: string, { size }: { size?: number } = {}) {
    if (!imageURL) return ''

    const params = new URLSearchParams()
    params.set('url', imageURL)
    if (size) params.set('width', size.toString())
    return `${config.public.likeCoinStaticEndpoint}/thumbnail/?${params.toString()}`
  }

  function getBookFileURLWithCORS({
    nftClassId,
    nftId,
    fileIndex,
    isCustomMessageEnabled,
  }: {
    nftClassId: string
    nftId: string | undefined
    fileIndex: string | number
    isCustomMessageEnabled: boolean
  }): string {
    const url = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
    url.searchParams.set('class_id', nftClassId)
    if (nftId) url.searchParams.set('nft_id', nftId)
    url.searchParams.set('index', String(fileIndex))
    url.searchParams.set('custom_message', isCustomMessageEnabled && nftId ? '1' : '0')
    return url.toString()
  }

  function getResizedNormalizedImageURL(imageURL: string, { size }: { size?: number } = {}) {
    const normalizedURL = normalizeURIToHTTP(imageURL)
    const resizedURL = getResizedImageURL(normalizedURL, { size })
    return resizedURL
  }

  return {
    normalizeURIToHTTP,
    getResizedImageURL,
    getBookFileURLWithCORS,
    getResizedNormalizedImageURL,
  }
}
