<template>
  <div class="relative">
    <header
      :class="[
        'sticky',
        'z-1',
        'top-0',

        ...gridClasses,
        'gap-4',

        'w-full',
        'max-w-[1440px]',
        'mx-auto',
        'px-4 laptop:px-12',
        'py-4',

        'bg-linear-to-b from-(--app-bg)/90 to-(--app-bg)/0',
      ]"
    >
      <div class="flex items-center max-phone:gap-1 gap-2 w-full">
        <UButton
          v-if="!isDefaultSortId"
          icon="i-material-symbols-close-rounded"
          variant="outline"
          rounded-full
          :ui="{ base: 'rounded-full bg-(--app-bg)' }"
          @click="handleCloseClick"
        />

        <UButton
          v-for="fixedSort in fixedSorts"
          v-else
          :key="fixedSort.value"
          :label="fixedSort.label"
          variant="outline"
          :ui="{
            base: 'rounded-full bg-(--app-bg) !ring-gray-600 max-phone:px-[10px] px-4',
            label: 'text-sm laptop:text-base',
          }"
          :to="localeRoute({ name: 'stake', query: { ...route.query, sort: fixedSort.value } })"
          @click.prevent="handleSortClick(fixedSort.value)"
        />

        <USelect
          v-model="sortId"
          :placeholder="isDefaultSortId ? $t('staking_explore_more_sorting') : undefined"
          :items="isDefaultSortId ? selectorSortItems : allSortItems"
          :content="{
            align: 'center',
            side: 'bottom',
            sideOffset: 8,
          }"
          arrow
          size="md"
          :ui="{
            base: [
              'rounded-full !ring-gray-600 justify-center text-sm laptop:text-base font-medium  max-phone:!pl-[10px] !pl-[16px]',
              isDefaultSortId
                ? 'bg-(--app-bg) hover:bg-[#d0cec8]'
                : 'bg-black text-white hover:bg-[#d0cec8] hover:text-black',
            ],
            content: 'rounded-lg',
            placeholder: isDefaultSortId ? '!text-black text-sm laptop:text-base' : undefined,
          }"
        />
      </div>
    </header>

    <main
      class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto pt-4 px-4 laptop:px-12 pb-16"
    >
      <div
        v-if="itemsCount === 0 && !isLoading && hasFetched"
        class="flex flex-col items-center m-auto"
      >
        <UIcon
          class="opacity-20"
          name="i-material-symbols-account-balance-wallet-outline"
          size="128"
        />

        <span
          class="font-bold opacity-20"
          v-text="$t('staking_explore_no_items')"
        />
      </div>
      <ul
        v-else
        :class="[
          ...gridClasses,
          'w-full',
        ]"
      >
        <StakingExploreItem
          v-for="(item, index) in stakingBooks"
          :id="item.nftClassId"
          :key="item.nftClassId"
          :class="getGridItemClassesByIndex(index)"
          :nft-class-id="item.nftClassId"
          :total-staked="Number(formatUnits(item.totalStaked, LIKE_TOKEN_DECIMALS))"
          :staker-count="item.stakerCount"
          :user-staked-amount="Number(formatUnits(item.userStakedAmount, LIKE_TOKEN_DECIMALS))"
          :lazy="index >= columnMax"
          @click="handleItemClick"
        />
      </ul>
      <div
        v-if="hasMoreItems"
        ref="infiniteScrollDetector"
        class="flex justify-center py-48"
      >
        <UIcon
          class="animate-spin"
          name="material-symbols-progress-activity"
          size="48"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { fetchCollectiveBookNFTs } from '~/shared/utils/collective-indexer'

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteQuery = useRouteQuery()
const runtimeConfig = useRuntimeConfig()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const stakingStore = useStakingStore()
const infiniteScrollDetectorElement = useTemplateRef<HTMLLIElement>('infiniteScrollDetector')

// Constants
const LIKE_TOKEN_DECIMALS = 6
const shouldLoadMore = useElementVisibility(infiniteScrollDetectorElement)
const { handleError } = useErrorHandler()
const isMobile = useMediaQuery('(max-width: 768px)')

// Constants
const SORT_TOTAL_STAKED = 'total_staked' // Keep internal value for UI consistency

// Hardcoded sort options for staking explore
const SORT_OPTIONS = [
  { value: SORT_TOTAL_STAKED, labelKey: 'staking_explore_sort_total_staked' },
  { value: 'staker_count', labelKey: 'staking_explore_sort_staker_count' },
  { value: 'recent', labelKey: 'staking_explore_sort_recent' },
]

function getIsDefaultSortId(id: string) {
  return id === SORT_TOTAL_STAKED
}

const sortId = computed({
  get: () => getRouteQuery('sort', SORT_TOTAL_STAKED),
  set: async (id) => {
    await navigateTo(localeRoute({
      name: 'stake',
      query: {
        ...route.query,
        // Remove the sort query if it is the default sort
        sort: getIsDefaultSortId(id) ? undefined : id,
      },
    }))
  },
})
const isDefaultSortId = computed(() => getIsDefaultSortId(sortId.value))

const allSortItems = computed(() => {
  return SORT_OPTIONS.map(option => ({
    label: $t(option.labelKey),
    value: option.value,
  }))
})

const sortsSliceIndex = computed(() => {
  return isMobile.value ? 2 : 3
})

const fixedSorts = computed(() => {
  return allSortItems.value.slice(0, sortsSliceIndex.value)
})

const selectorSortItems = computed(() => {
  return allSortItems.value.slice(sortsSliceIndex.value)
})

const sortName = computed(() => {
  const option = SORT_OPTIONS.find(o => o.value === sortId.value)
  return option ? $t(option.labelKey) : ''
})

const canonicalURL = computed(() => {
  const baseURL = runtimeConfig.public.baseURL
  const path = route.path

  const canonicalParams = new URLSearchParams()
  if (!isDefaultSortId.value && sortId.value) {
    canonicalParams.set('sort', sortId.value)
  }

  const queryString = canonicalParams.toString()
  return `${baseURL}${path}${queryString ? `?${queryString}` : ''}`
})

// State
const stakingBooks = ref<Array<{
  nftClassId: string
  totalStaked: bigint
  stakerCount: number
  userStakedAmount: bigint
}>>([])
const isLoading = ref(false)
const hasFetched = ref(false)
const hasMoreItems = ref(false)
const currentOffset = ref(0)

const itemsCount = computed(() => stakingBooks.value.length)

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount: computed(() => itemsCount.value),
  hasMore: hasMoreItems,
})

// Get user's staking data for comparison
const userStakingData = computed(() => {
  return hasLoggedIn.value && user.value?.evmWallet
    ? stakingStore.getUserStakingData(user.value.evmWallet)
    : { items: [] }
})

useHead(() => {
  return {
    title: [$t('staking_explore_page_title'), sortName.value].filter(Boolean).join(' › '),
    meta: [
      {
        name: 'description',
        content: $t('staking_explore_page_description'),
      },
      {
        name: 'robots',
        content: 'index, follow',
      },
    ],
    link: [
      {
        rel: 'canonical',
        href: canonicalURL.value,
      },
    ],
  }
})

async function fetchStakingBooks({ isRefresh = false } = {}) {
  if (isLoading.value) return

  try {
    isLoading.value = true

    if (isRefresh) {
      currentOffset.value = 0
      stakingBooks.value = []
      hasMoreItems.value = false
    }

    // Map sortId to API sort parameters
    let sortBy: 'staked_amount' | 'last_staked_at' | 'number_of_stakers' = 'staked_amount'
    const sortOrder = 'desc'

    switch (sortId.value) {
      case 'staker_count':
        sortBy = 'number_of_stakers'
        break
      case 'recent':
        sortBy = 'last_staked_at'
        break
      default:
        sortBy = 'staked_amount'
    }

    const result = await fetchCollectiveBookNFTs({
      'pagination.limit': 30,
      'time_frame_sort_order': sortOrder,
      'time_frame_sort_by': sortBy,
    })

    const bookNFTs = result.data.map((bookNFT) => {
      // Find user's stake for this book if logged in
      let userStakedAmount = 0n
      if (hasLoggedIn.value) {
        const userStake = userStakingData.value.items.find(
          item => item.nftClassId === bookNFT.evm_address,
        )
        userStakedAmount = userStake?.stakedAmount || 0n
      }

      return {
        nftClassId: bookNFT.evm_address,
        totalStaked: BigInt(bookNFT.staked_amount || 0),
        stakerCount: bookNFT.number_of_stakers,
        userStakedAmount,
      }
    })

    if (isRefresh) {
      stakingBooks.value = bookNFTs
    }
    else {
      stakingBooks.value.push(...bookNFTs)
    }

    // Update pagination
    currentOffset.value += result.data.length
    hasMoreItems.value = result.data.length === 30 // Has more if we got full page

    hasFetched.value = true
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_explore_fetch_error'),
    })
  }
  finally {
    isLoading.value = false
  }
}

async function handleSortClick(sortValue?: string) {
  if (!sortValue || sortValue === sortId.value) {
    return
  }
  useLogEvent('staking_explore_sort_click', { sort_id: sortValue })
  sortId.value = sortValue
}

async function handleCloseClick() {
  useLogEvent('staking_explore_sort_close_click', { sort_id: sortId.value })
  sortId.value = SORT_TOTAL_STAKED
}

function handleItemClick(nftClassId: string) {
  useLogEvent('staking_explore_item_click', {
    nft_class_id: nftClassId,
  })

  navigateTo(localeRoute({
    name: 'stake-nftClassId',
    params: { nftClassId },
  }))
}

// Watch sort changes
watch(sortId, async () => {
  await fetchStakingBooks({ isRefresh: true })
})

// Load user staking data if logged in
watch(hasLoggedIn, async (isLoggedIn) => {
  if (isLoggedIn && user.value?.evmWallet) {
    await stakingStore.fetchUserStakingData(user.value.evmWallet)
    // Refresh books to show user staking amounts
    await fetchStakingBooks({ isRefresh: true })
  }
})

// Infinite scroll
watch(
  () => shouldLoadMore.value,
  async (shouldLoadMore) => {
    if (shouldLoadMore && hasMoreItems.value && !isLoading.value) {
      await fetchStakingBooks()
    }
  },
)

onMounted(async () => {
  // Load user staking data first if logged in
  if (hasLoggedIn.value && user.value?.evmWallet) {
    await stakingStore.fetchUserStakingData(user.value.evmWallet)
  }

  // Then load staking books
  await fetchStakingBooks({ isRefresh: true })
})
</script>
