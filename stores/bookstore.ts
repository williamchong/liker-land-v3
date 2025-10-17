interface BookstoreCMSTagProducts {
  items: BookstoreCMSProduct[]
  isFetching: boolean
  hasFetched: boolean
  offset?: string
  ts?: number
}

interface BookstoreSearchResults {
  items: Array<{
    classId: string
    title: string
    imageUrl: string
    minPrice?: number
  }>
  isFetching: boolean
  hasFetched: boolean
  nextKey?: string
}

export const useBookstoreStore = defineStore('bookstore', () => {
  const bookstoreInfoByNFTClassIdMap = ref<Record<string, BookstoreInfo | null>>({})

  const getBookstoreInfoByNFTClassId = computed(() => (nftClassId: string) => {
    return bookstoreInfoByNFTClassIdMap.value[nftClassId]
  })

  function addBookstoreInfoByNFTClassId(nftClassId: string, data: BookstoreInfo | null) {
    bookstoreInfoByNFTClassIdMap.value[nftClassId] = data
  }

  /* Bookstore CMS Products */

  const bookstoreCMSProductsByTagIdMap = ref<Record<string, BookstoreCMSTagProducts>>({})
  const getBookstoreCMSProductsByTagId = computed(() => (tagId: string) => {
    return {
      items: bookstoreCMSProductsByTagIdMap.value[tagId]?.items || [],
      isFetchingItems: bookstoreCMSProductsByTagIdMap.value[tagId]?.isFetching || false,
      hasFetchedItems: bookstoreCMSProductsByTagIdMap.value[tagId]?.hasFetched || false,
      nextItemsKey: bookstoreCMSProductsByTagIdMap.value[tagId]?.offset || undefined,
    }
  })

  async function fetchCMSProductsByTagId(tagId: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    if (bookstoreCMSProductsByTagIdMap.value[tagId]?.isFetching) {
      return
    }
    if (!bookstoreCMSProductsByTagIdMap.value[tagId] || isRefresh) {
      bookstoreCMSProductsByTagIdMap.value[tagId] = {
        items: [],
        isFetching: false,
        hasFetched: false,
        offset: undefined,
        ts: getTimestampRoundedToMinute(),
      }
    }
    try {
      bookstoreCMSProductsByTagIdMap.value[tagId].isFetching = true
      const result = await fetchBookstoreCMSProductsByTagId(tagId, {
        offset: isRefresh ? undefined : bookstoreCMSProductsByTagIdMap.value[tagId]?.offset,
        ts: bookstoreCMSProductsByTagIdMap.value[tagId].ts,
      })

      if (isRefresh) {
        bookstoreCMSProductsByTagIdMap.value[tagId].items = result.records
      }
      else {
        bookstoreCMSProductsByTagIdMap.value[tagId].items.push(...result.records)
      }
      bookstoreCMSProductsByTagIdMap.value[tagId].offset = result.offset
      bookstoreCMSProductsByTagIdMap.value[tagId].hasFetched = true
    }
    catch (error) {
      // HACK: When `hasFetched` is placed inside the finally block, it will execute before `items` are updated.
      bookstoreCMSProductsByTagIdMap.value[tagId].hasFetched = true
      throw error
    }
    finally {
      bookstoreCMSProductsByTagIdMap.value[tagId].isFetching = false
    }
  }

  /* Bookstore CMS Tags */

  const bookstoreCMSTags = ref<Array<BookstoreCMSTag>>([])
  const isFetchingBookstoreCMSTags = ref(false)

  const getBookstoreCMSTagById = computed(() => (tagId: string) => {
    return bookstoreCMSTags.value.find(tag => tag.id === tagId)
  })

  async function fetchBookstoreCMSTags() {
    if (isFetchingBookstoreCMSTags.value) return
    try {
      isFetchingBookstoreCMSTags.value = true
      const result = await fetchBookstoreCMSTagsForAll()
      bookstoreCMSTags.value = result.records
    }
    finally {
      isFetchingBookstoreCMSTags.value = false
    }
  }

  /* Bookstore Search Results */

  const bookstoreSearchResultsByQueryMap = ref<Record<string, BookstoreSearchResults>>({})

  const getBookstoreSearchResultsByQuery = computed(() => (query: string) => {
    const items
      = (bookstoreSearchResultsByQueryMap.value[query]?.items || [])
        .filter((item) => {
          const bookstoreInfo = getBookstoreInfoByNFTClassId.value(item.classId)
          return bookstoreInfo !== null && !bookstoreInfo?.isHidden
        })
    return {
      items,
      isFetchingItems: bookstoreSearchResultsByQueryMap.value[query]?.isFetching || false,
      hasFetchedItems: bookstoreSearchResultsByQueryMap.value[query]?.hasFetched || false,
      nextItemsKey: bookstoreSearchResultsByQueryMap.value[query]?.nextKey || undefined,
    }
  })

  function checkAndInitializeSearchState(queryKey: string, isRefresh: boolean) {
    if (bookstoreSearchResultsByQueryMap.value[queryKey]?.isFetching) {
      return false
    }

    if (!bookstoreSearchResultsByQueryMap.value[queryKey] || isRefresh) {
      bookstoreSearchResultsByQueryMap.value[queryKey] = {
        items: [],
        isFetching: false,
        hasFetched: false,
      }
    }

    bookstoreSearchResultsByQueryMap.value[queryKey].isFetching = true
    return true
  }

  function updateSearchResults(queryKey: string, items: BookstoreSearchResults['items'], nextKey: string | undefined, isRefresh: boolean) {
    const state = bookstoreSearchResultsByQueryMap.value[queryKey]
    if (!state) return

    if (isRefresh) {
      state.items = items
    }
    else {
      state.items.push(...items)
    }
    state.nextKey = nextKey
  }

  function finalizeSearchState(queryKey: string) {
    const state = bookstoreSearchResultsByQueryMap.value[queryKey]
    if (!state) return

    state.hasFetched = true
    state.isFetching = false
  }

  async function fetchTextSearch(searchTerm: string, queryKey: string, isRefresh: boolean) {
    const result = await fetchBookstoreCMSPublicationsBySearchTerm(searchTerm, {
      offset: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
      limit: 100,
      ts: getTimestampRoundedToMinute(),
    })

    const mappedItems = result.records
      .filter(item => item.classId && item.title && item.imageUrl)
      .map(item => ({
        classId: item.classId!,
        title: item.title!,
        imageUrl: item.imageUrl!,
        minPrice: item.minPrice,
      }))

    updateSearchResults(queryKey, mappedItems, result.offset, isRefresh)
  }

  async function fetchMetadataSearch(type: 'author' | 'publisher', searchTerm: string, queryKey: string, isRefresh: boolean) {
    const options = {
      limit: 100,
      key: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
    }

    const result = await fetchNFTClassesByMetadata(type, searchTerm, options)

    if (result) {
      const nftClasses = result.data.map(item => ({
        ...item,
        address: item.address.toLowerCase(),
      }))
      const mappedItems = nftClasses
        .map(nftClass => ({
          classId: nftClass.address.toLowerCase(),
          title: nftClass.name || '',
          imageUrl: nftClass.metadata?.image || '',
          minPrice: undefined,
        }))

      const nextKey = result.pagination.count === options.limit ? result.pagination?.next_key?.toString() : undefined
      updateSearchResults(queryKey, mappedItems, nextKey, isRefresh)
    }
  }

  async function fetchOwnerWalletSearch(walletAddress: string, queryKey: string, isRefresh: boolean) {
    const options = {
      limit: 100,
      key: isRefresh ? undefined : bookstoreSearchResultsByQueryMap.value[queryKey]?.nextKey,
      isBooksOnly: true,
    }

    const result = await fetchNFTClassesByOwnerWalletAddress(walletAddress, options)

    if (result) {
      const nftClasses = result.data.map(item => ({
        ...item,
        address: item.address.toLowerCase(),
      }))
      const mappedItems = nftClasses
        .map(nftClass => ({
          classId: nftClass.address.toLowerCase(),
          title: nftClass.name || '',
          imageUrl: nftClass.metadata?.image || '',
          minPrice: undefined,
        }))

      const nextKey = result.pagination.count === options.limit ? result.pagination?.next_key?.toString() : undefined
      updateSearchResults(queryKey, mappedItems, nextKey, isRefresh)
    }
  }

  async function fetchSearchResults(type: 'q' | 'author' | 'publisher' | 'owner_wallet', searchTerm: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    const queryKey = `${type}:${searchTerm}`

    if (!checkAndInitializeSearchState(queryKey, isRefresh)) {
      return
    }

    try {
      if (type === 'q') {
        await fetchTextSearch(searchTerm, queryKey, isRefresh)
      }
      else if (type === 'owner_wallet') {
        await fetchOwnerWalletSearch(searchTerm, queryKey, isRefresh)
      }
      else {
        await fetchMetadataSearch(type, searchTerm, queryKey, isRefresh)
      }
    }
    finally {
      finalizeSearchState(queryKey)
    }
  }

  return {
    bookstoreInfoByNFTClassIdMap,

    getBookstoreInfoByNFTClassId,

    addBookstoreInfoByNFTClassId,

    /* Bookstore CMS Products */

    bookstoreCMSProductsByTagIdMap,

    getBookstoreCMSProductsByTagId,

    fetchCMSProductsByTagId,

    /* Bookstore CMS Tags */

    bookstoreCMSTags,
    isFetchingBookstoreCMSTags,

    getBookstoreCMSTagById,

    fetchBookstoreCMSTags,

    /* Bookstore Search Results */

    bookstoreSearchResultsByQueryMap,

    getBookstoreSearchResultsByQuery,

    fetchSearchResults,
  }
})
