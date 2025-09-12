export interface PaginationInfo {
  next_key?: number
  count: number
}

export interface FetchNFTClassesByOwnerWalletAddressResponseData {
  data: NFTClass[]
  pagination: PaginationInfo
}

export interface FetchNFTsByWalletAddressResponseData {
  data: NFT[]
  pagination: PaginationInfo
}

export interface FetchLikeCoinNFTClassChainMetadataResponseData {
  metadata: NFTClassMetadata
}

export function getIndexerAPIFetch() {
  const config = useRuntimeConfig()
  return $fetch.create({ baseURL: config.public.likeCoinEVMChainAPIEndpoint })
}

export interface IndexerQueryOptions {
  reverse?: boolean
  limit?: number
  key?: string
  nocache?: boolean
  isBooksOnly?: boolean
  filter?: Record<string, string>
}

export function getIndexerQueryOptions({
  reverse = true,
  limit = 30,
  key,
  nocache,
  isBooksOnly = true,
  filter = {},
}: IndexerQueryOptions = {}) {
  const query: Record<string, string> = {}
  if (reverse) query.reverse = reverse.toString()
  if (limit) query['pagination.limit'] = limit.toString()
  if (key) query['pagination.key'] = key
  if (nocache) query.ts = Date.now().toString()
  const contractFilter: string[] = []
  if (isBooksOnly) contractFilter.push('@type', 'Book')
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      contractFilter.push(key, value)
    }
  }
  if (contractFilter.length > 0) {
    query['contract_level_metadata_eq'] = contractFilter.join(',')
  }
  return query
}

export function fetchNFTClassesByOwnerWalletAddress(walletAddress: string, options: IndexerQueryOptions) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchNFTClassesByOwnerWalletAddressResponseData>(`/account/${walletAddress}/booknfts`, {
    query: getIndexerQueryOptions(options),
  })
};

export async function fetchNFTClassesByMetadata(
  filterType: 'author' | 'publisher',
  filterValue: string,
  options: IndexerQueryOptions = {},
): Promise<FetchNFTClassesByOwnerWalletAddressResponseData> {
  const fetch = getIndexerAPIFetch()

  if (filterType === 'author') {
    // For author searches, query both 'author.name' and 'author' fields
    const authorNameOptions = {
      ...options,
      filter: { ...options.filter, 'author.name': filterValue.replaceAll(',', '%2C') },
    }
    const authorOptions = {
      ...options,
      filter: { ...options.filter, author: filterValue.replaceAll(',', '%2C') },
    }

    const [authorNameResult, authorResult] = await Promise.all([
      fetch<FetchNFTClassesByOwnerWalletAddressResponseData>(`/booknfts`, {
        query: getIndexerQueryOptions(authorNameOptions),
      }),
      fetch<FetchNFTClassesByOwnerWalletAddressResponseData>(`/booknfts`, {
        query: getIndexerQueryOptions(authorOptions),
      }),
    ])

    // Merge results and remove duplicates
    const combinedDataMap: Record<string, NFTClass> = {}
    authorNameResult.data.forEach((item) => {
      combinedDataMap[item.address] = item
    })
    authorResult.data.forEach((item) => {
      combinedDataMap[item.address] = item
    })
    const combinedData = Object.values(combinedDataMap)

    const queryOptions = getIndexerQueryOptions(options)
    const actualLimit = parseInt(queryOptions['pagination.limit'] || '30')

    let combinedNextKey: number | undefined
    if (authorNameResult.pagination.count < actualLimit && authorResult.pagination.count < actualLimit) {
      combinedNextKey = undefined
    }
    else {
      const authorNameNextKey = authorNameResult.pagination.count === actualLimit ? authorNameResult.pagination.next_key : undefined
      const authorNextKey = authorResult.pagination.count === actualLimit ? authorResult.pagination.next_key : undefined

      if (authorNameNextKey !== undefined && authorNextKey !== undefined) {
        combinedNextKey = Math.min(authorNameNextKey, authorNextKey)
      }
      else if (authorNameNextKey !== undefined) {
        combinedNextKey = authorNameNextKey
      }
      else if (authorNextKey !== undefined) {
        combinedNextKey = authorNextKey
      }
    }

    return {
      data: combinedData,
      pagination: {
        count: combinedData.length,
        next_key: combinedNextKey,
      },
    }
  }
  else if (filterType === 'publisher') {
    if (!options.filter) {
      options.filter = {}
    }
    options.filter.publisher = filterValue

    return fetch<FetchNFTClassesByOwnerWalletAddressResponseData>(`/booknfts`, {
      query: getIndexerQueryOptions(options),
    })
  }

  throw new Error(`Unsupported filter type: ${filterType}`)
}

export function fetchNFTsByOwnerWalletAddress(walletAddress: string, options: IndexerQueryOptions) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchNFTsByWalletAddressResponseData>(`/account/${walletAddress}/tokens`, {
    query: getIndexerQueryOptions(options),
  })
};

export function fetchLikeCoinNFTClassChainMetadataById(nftClassId: string) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchLikeCoinNFTClassChainMetadataResponseData>(`/booknft/${nftClassId}`)
}
