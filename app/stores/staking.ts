import { formatUnits } from 'viem'

export interface StakingItem {
  nftClassId: string
  stakedAmount: bigint
  pendingRewards: bigint
  isOwned: boolean
}

interface UserStakingData {
  items: StakingItem[]
  totalUnclaimedRewards: bigint
  isFetching: boolean
  hasFetched: boolean
  ts?: number
}

interface NFTClassTotalStake {
  nftClassId: string
  totalStake: bigint
  numberOfStakers: number
  stakingRank: number
  isFetching: boolean
}

// The collective indexer rejects `pagination.limit` above 100, so the shelf has
// to walk the cursor. The page cap only guards against a cursor that never ends.
const STAKINGS_PAGE_LIMIT = 100
const STAKINGS_MAX_PAGES = 50

export const useStakingStore = defineStore('staking', () => {
  const { likeCoinTokenDecimals } = useRuntimeConfig().public
  const { loggedIn: hasLoggedIn } = useUserSession()
  const {
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
  } = useLikeCollectiveContract()

  // State
  const stakingDataByWalletMap = ref<Record<string, UserStakingData>>({})
  const totalStakeByNFTClassMap = ref<Record<string, NFTClassTotalStake>>({})

  // Getters
  const getUserStakingData = computed(() => (walletAddress: string) => {
    return {
      items: stakingDataByWalletMap.value[walletAddress]?.items || [],
      totalUnclaimedRewards: stakingDataByWalletMap.value[walletAddress]?.totalUnclaimedRewards || 0n,
      isFetching: stakingDataByWalletMap.value[walletAddress]?.isFetching || false,
      hasFetched: stakingDataByWalletMap.value[walletAddress]?.hasFetched || false,
    }
  })

  const getFormattedTotalRewards = computed(() => (walletAddress: string) => {
    const totalRewards = stakingDataByWalletMap.value[walletAddress]?.totalUnclaimedRewards || 0n
    return Number(formatUnits(totalRewards, likeCoinTokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })
  })

  const getTotalStakeOfNFTClassCached = computed(() => (nftClassId: string) => {
    return totalStakeByNFTClassMap.value[normalizeNFTClassId(nftClassId)]?.totalStake ?? 0n
  })

  const getStakingRankCached = computed(() => (nftClassId: string) => {
    return totalStakeByNFTClassMap.value[normalizeNFTClassId(nftClassId)]?.stakingRank ?? 0
  })

  const getNumberOfStakersCached = computed(() => (nftClassId: string) => {
    return totalStakeByNFTClassMap.value[normalizeNFTClassId(nftClassId)]?.numberOfStakers ?? 0
  })

  // Actions
  // Keyed per wallet and held in the store (not module scope) so an SSR request
  // and a test's fresh Pinia each get their own.
  const inflightFetchByWallet = new Map<string, Promise<void>>()

  // Overlapping callers join the walk in progress instead of being dropped: a
  // post-claim refresh or a retry that lands mid-walk used to return as done
  // while the first fetch was still paging, silently skipping the refresh.
  async function fetchUserStakingData(walletAddress: string) {
    const pendingFetch = inflightFetchByWallet.get(walletAddress)
    if (pendingFetch) {
      return pendingFetch
    }

    const task = (async () => {
      if (!stakingDataByWalletMap.value[walletAddress]) {
        stakingDataByWalletMap.value[walletAddress] = {
          items: [],
          totalUnclaimedRewards: 0n,
          isFetching: false,
          hasFetched: false,
          ts: getTimestampRoundedToMinute(),
        }
      }

      // Every write goes through this entry rather than re-reading the map: a
      // logout swaps the map out mid-walk, and writing into whatever replaced
      // it would resurrect the signed-out row or clobber a newer fetch.
      const stakingData = stakingDataByWalletMap.value[walletAddress]!

      try {
        stakingData.isFetching = true

        // Get books user has staked on from collective indexer
        try {
          const stakingItemsByNFTClassId = new Map<string, StakingItem>()
          let paginationKey: number | undefined

          for (let page = 0; page < STAKINGS_MAX_PAGES; page += 1) {
            const stakingsResponse = await fetchCollectiveAccountStakings(walletAddress, {
              'pagination.limit': STAKINGS_PAGE_LIMIT,
              'pagination.key': paginationKey,
            })

            for (const staking of stakingsResponse.data) {
              const nftClassId = normalizeNFTClassId(staking.book_nft)

              if (stakingItemsByNFTClassId.has(nftClassId)) {
                continue
              }

              // Use data from indexer
              const stakedAmount = BigInt(staking.staked_amount)
              const pendingRewards = BigInt(staking.pending_reward_amount)

              // Only add if there's still an active stake or pending rewards
              if (stakedAmount > 0n || pendingRewards > 0n) {
                stakingItemsByNFTClassId.set(nftClassId, {
                  nftClassId,
                  stakedAmount,
                  pendingRewards,
                  isOwned: false, // This will be updated in UI layer for owned books
                })
              }
            }

            paginationKey = getIndexerNextKey(stakingsResponse, STAKINGS_PAGE_LIMIT)
            if (!paginationKey) break
          }

          if (paginationKey) {
            console.warn(`Stopped paging staking positions after ${STAKINGS_MAX_PAGES} pages:`, walletAddress)
          }

          // Assigned only after the last page, so a mid-loop failure commits nothing.
          // Sorted by staked amount descending
          stakingData.items = Array.from(stakingItemsByNFTClassId.values())
            .sort((a, b) => Number(b.stakedAmount - a.stakedAmount))
        }
        catch (error) {
          // Keep the last known items: a failed fetch is not "nothing staked".
          console.warn('Failed to fetch collective staking data:', error)
        }

        stakingData.totalUnclaimedRewards = stakingData.items.reduce(
          (total, item) => total + item.pendingRewards,
          0n,
        )
        stakingData.hasFetched = true
      }
      catch (error) {
        stakingData.hasFetched = true
        throw error
      }
      finally {
        stakingData.isFetching = false
      }
    })().finally(() => inflightFetchByWallet.delete(walletAddress))
    inflightFetchByWallet.set(walletAddress, task)
    return task
  }

  function clearUserStakingData(walletAddress: string) {
    if (stakingDataByWalletMap.value[walletAddress]) {
      stakingDataByWalletMap.value[walletAddress] = {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
    }
  }

  // Items are keyed lowercase; a caller passing another casing would otherwise
  // push a duplicate row that double-counts in totalUnclaimedRewards.
  function updateStakingItem(
    walletAddress: string,
    nftClassId: string,
    updates: Partial<Omit<StakingItem, 'nftClassId'>>,
  ) {
    const normalizedNFTClassId = normalizeNFTClassId(nftClassId)

    // Initialize user data if it doesn't exist
    if (!stakingDataByWalletMap.value[walletAddress]) {
      stakingDataByWalletMap.value[walletAddress] = {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
    }

    const userData = stakingDataByWalletMap.value[walletAddress]
    const itemIndex = userData.items.findIndex(item => item.nftClassId === normalizedNFTClassId)

    // Initialize item if it doesn't exist
    const existingItem = userData.items[itemIndex]
    if (!existingItem) {
      userData.items.push({
        nftClassId: normalizedNFTClassId,
        stakedAmount: 0n,
        pendingRewards: 0n,
        isOwned: false,
        ...updates,
      })
    }
    else {
      userData.items[itemIndex] = { ...existingItem, ...updates }
    }

    // Recalculate total rewards
    userData.totalUnclaimedRewards = userData.items.reduce(
      (total, item) => total + item.pendingRewards,
      0n,
    )
  }

  async function fetchTotalStakeOfNFTClass(rawNFTClassId: string, {
    isRefresh = false,
  }: {
    isRefresh?: boolean
  } = {}) {
    // Keyed lowercase like the item list, so mixed casing can't split the cache.
    const nftClassId = normalizeNFTClassId(rawNFTClassId)
    const cached = totalStakeByNFTClassMap.value[nftClassId]

    // Return cached value if available and not forcing refresh
    if (cached && !isRefresh && !cached.isFetching) {
      return cached.totalStake
    }

    // Avoid duplicate fetches
    if (cached?.isFetching) {
      return cached.totalStake
    }

    try {
      if (!totalStakeByNFTClassMap.value[nftClassId]) {
        totalStakeByNFTClassMap.value[nftClassId] = {
          nftClassId,
          totalStake: 0n,
          numberOfStakers: 0,
          stakingRank: 0,
          isFetching: false,
        }
      }

      totalStakeByNFTClassMap.value[nftClassId].isFetching = true

      const [totalStake, bookNFTData] = await Promise.all([
        getTotalStakeOfNFTClass(nftClassId),
        fetchCollectiveBookNFT(nftClassId).catch(() => ({ number_of_stakers: 0, staking_rank: undefined })),
      ])

      if (totalStakeByNFTClassMap.value[nftClassId]) {
        totalStakeByNFTClassMap.value[nftClassId].totalStake = totalStake
        totalStakeByNFTClassMap.value[nftClassId].numberOfStakers = bookNFTData.number_of_stakers
        totalStakeByNFTClassMap.value[nftClassId].stakingRank = bookNFTData.staking_rank ?? 0
      }

      return totalStake
    }
    finally {
      if (totalStakeByNFTClassMap.value[nftClassId]) {
        totalStakeByNFTClassMap.value[nftClassId].isFetching = false
      }
    }
  }

  async function fetchNFTClassStakingData(walletAddress: string, nftClassId: string) {
    const [stakedAmount, pendingRewards] = await Promise.all([
      getWalletStakeOfNFTClass(walletAddress, nftClassId),
      getWalletPendingRewardsOfNFTClass(walletAddress, nftClassId),
    ])

    const normalizedNFTClassId = normalizeNFTClassId(nftClassId)
    const updates = { stakedAmount, pendingRewards, isOwned: false }
    updateStakingItem(walletAddress, normalizedNFTClassId, updates)

    const stakingItem: StakingItem = { nftClassId: normalizedNFTClassId, ...updates }
    return stakingItem
  }

  function reset() {
    stakingDataByWalletMap.value = {}
    totalStakeByNFTClassMap.value = {}
    // Without this a walk still in flight stays joinable, so a re-login would
    // wait on a fetch whose entry is gone and can no longer commit anything.
    inflightFetchByWallet.clear()
  }

  watch(hasLoggedIn, (value, oldValue) => {
    if (oldValue && !value) {
      reset()
    }
  })

  // Note: Stake mode is now auto-detected based on route

  return {
    stakingDataByWalletMap,
    totalStakeByNFTClassMap,

    getUserStakingData,
    getFormattedTotalRewards,
    getTotalStakeOfNFTClassCached,
    getStakingRankCached,
    getNumberOfStakersCached,

    fetchUserStakingData,
    fetchTotalStakeOfNFTClass,
    fetchNFTClassStakingData,
    clearUserStakingData,
    updateStakingItem,
  }
})
