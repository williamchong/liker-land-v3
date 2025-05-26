export default function ({ nftClassId = '' }: { nftClassId?: string } = {}) {
  const { t: $t } = useI18n()
  const localeRoute = useLocaleRoute()
  const localeString = useLocaleString()
  const metadataStore = useMetadataStore()
  const bookstoreStore = useBookstoreStore()
  const evmBookInfo = useEVMBookInfo({ nftClassId })
  const legacyBookInfo = useLegacyBookInfo({ nftClassId })
  const isEVM = computed(() => checkIsEVMAddress(nftClassId))

  const bookInfo = isEVM.value ? evmBookInfo : legacyBookInfo
  const bookstoreInfo = computed(() => {
    return bookstoreStore.getBookstoreInfoByNFTClassId(nftClassId)
  })

  const nftClassOwnerWalletAddress = computed(() => bookstoreInfo.value?.ownerWallet || '')
  const nftClassOwnerName = computed(() => {
    return metadataStore.getLikerInfoByWalletAddress(nftClassOwnerWalletAddress.value)?.displayName || ''
  })

  const authorName = computed(() => {
    const author = bookInfo.author.value
    if (typeof author === 'string') return author
    if (typeof author === 'object' && 'name' in author) return author.name
    return ''
  })

  const authorDescription = computed(() => {
    return bookstoreInfo.value?.author.description || ''
  })

  const publisherName = computed(() => bookInfo.publisher.value)

  const formattedPublishedDate = computed(() => {
    return bookInfo.publishedDate.value?.toISOString().split('T')[0] || ''
  })

  const readActionEntryPoints = computed(() => {
    const potentialAction = bookInfo.potentialAction.value
    let readAction: ReadAction | undefined
    if (potentialAction && potentialAction['@type'] === 'ReadAction') {
      readAction = potentialAction as ReadAction
    }
    let entryPoints: ReadActionEntryPoint[] = []
    if (readAction) {
      entryPoints = readAction.target || []
    }
    return entryPoints.map((entryPoint, index) => {
      const { contentType, url, name } = entryPoint
      return {
        url: normalizeURIToHTTP(url),
        name,
        type: extractContentTypeFromURL(contentType),
        index,
      }
    })
  })

  const contentURLs = computed(() => {
    if (readActionEntryPoints.value.length) {
      return readActionEntryPoints.value
    }
    return bookInfo.sameAs.value.map((url, index) => ({
      url: normalizeURIToHTTP(url),
      name: extractFilenameFromContentURL(url),
      type: extractContentTypeFromURL(url),
      index,
    }))
  })

  const contentTypes = computed(() => {
    const types = contentURLs.value.map(({ type }) => type)
    return [...new Set(types.filter(type => type !== 'unknown'))]
  })

  const formattedContentTypes = computed(() => contentTypes.value.map((type) => {
    switch (type) {
      case 'pdf':
        return 'PDF'
      case 'epub':
        return 'EPUB'
      default:
        return $t('other_file_type')
    }
  }).join($t('text_separator_comma')))

  const isCustomMessageEnabled = computed(() => {
    return bookstoreInfo.value?.enableCustomMessagePage || false
  })

  const isDownloadable = computed(() => {
    return !bookstoreInfo.value?.hideDownload || false
  })

  const formattedReadingMethods = computed(() => {
    const methods = [$t('reading_method_read_online')]
    if (isDownloadable.value) {
      methods.push($t('reading_method_download_file'))
    }
    return methods.join($t('text_separator_slash'))
  })

  const keywords = computed(() => {
    return bookstoreInfo.value?.keywords.filter(keyword => !!keyword) || []
  })

  const pricingItems = computed(() => {
    return (bookstoreInfo.value?.prices || []).filter(item => !item.isUnlisted).map((item) => {
      return {
        index: item.index,
        name: localeString(item.name),
        description: localeString(item.description),
        price: item.price,
        currency: item.price > 0 ? 'US' : '',
        isSoldOut: item.isSoldOut,
        canTip: item.isAllowCustomPrice,
        isPhysicalOnly: item.isPhysicalOnly,
      }
    })
  })

  const productPageRoute = computed(() => localeRoute({
    name: 'store-id',
    params: { id: nftClassId },
  }))

  return {
    isEVM,

    ...bookInfo,

    nftClassOwnerWalletAddress,
    nftClassOwnerName,
    authorName,
    authorDescription,
    publisherName,
    formattedPublishedDate,

    contentURLs,
    contentTypes,
    formattedContentTypes,

    bookstoreInfo,
    isCustomMessageEnabled,
    isDownloadable,
    formattedReadingMethods,
    keywords,

    pricingItems,

    productPageRoute,
  }
}
