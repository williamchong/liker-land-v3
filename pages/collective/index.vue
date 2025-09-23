<template>
  <div>
    <header class="flex gap-6 w-full max-w-[1440px] mx-auto px-4 laptop:px-12 py-4">
      <div class="flex items-center gap-2 overflow-hidden">
        <UAvatar
          :src="user?.avatar"
          :alt="userDisplayName"
          icon="i-material-symbols-person-2-rounded"
          size="3xl"
        />

        <div class="overflow-hidden">
          <p
            v-if="userDisplayName"
            class="font-medium text-highlighted text-sm"
            v-text="userDisplayName"
          />
          <p
            v-if="user?.evmWallet"
            :class="[
              userDisplayName ? 'text-muted' : 'text-highlighted',
              'text-xs',
              'text-ellipsis',
              'font-mono',
              'overflow-hidden',
              'whitespace-nowrap',
            ]"
            v-text="user.evmWallet"
          />
        </div>
      </div>

      <!-- Total Unclaimed Rewards & Claim Button next to Avatar -->
      <div
        v-if="hasLoggedIn"
        class="flex items-center gap-3"
      >
        <div>
          <div class="flex items-baseline gap-2">
            <span class="text-lg font-bold text-green-500">
              {{ formattedTotalRewards }}
            </span>
            <span class="text-xs text-gray-500">LIKE</span>
          </div>
          <p class="text-xs text-gray-600">
            {{ $t('staking_dashboard_total_rewards') }}
          </p>
        </div>
        <UButton
          v-if="totalUnclaimedRewards > 0n"
          :label="$t('staking_claim_all_rewards')"
          color="success"
          size="sm"
          :loading="isClaimingAllRewards"
          @click="handleClaimAllRewards"
        />
      </div>
    </header>

    <main class="flex flex-col items-center grow w-full max-w-[1440px] mx-auto px-4 laptop:px-12 pb-16">
      <UCard
        v-if="!hasLoggedIn"
        class="w-full max-w-sm mt-8"
        :ui="{ footer: 'flex justify-end' }"
      >
        <p v-text="$t('staking_dashboard_please_login')" />
        <template #footer>
          <LoginButton />
        </template>
      </UCard>

      <!-- Loading State -->
      <div
        v-if="hasLoggedIn && isLoading"
        class="flex flex-col items-center m-auto py-24"
      >
        <UIcon
          class="animate-spin opacity-50"
          name="material-symbols-progress-activity"
          size="48"
        />
        <span class="mt-4 text-gray-500">{{ $t('loading') }}...</span>
      </div>

      <!-- Books List -->
      <div
        v-else-if="hasLoggedIn && (stakingItems.length === 0 && !isLoading && hasFetched)"
        class="flex flex-col items-center m-auto"
      >
        <UIcon
          class="opacity-20"
          name="i-material-symbols-account-balance-wallet-outline"
          size="128"
        />

        <span
          class="font-bold opacity-20"
          v-text="$t('staking_dashboard_no_items')"
        />

        <p
          class="text-center text-muted mt-2 max-w-md"
          v-text="$t('staking_dashboard_no_items_description')"
        />

        <UButton
          class="mt-4"
          leading-icon="i-material-symbols-storefront-outline"
          :label="$t('staking_buy_books_cta')"
          :to="localeRoute({ name: 'store' })"
        />

        <UButton
          class="mt-2"
          leading-icon="i-material-symbols-explore-outline"
          :label="$t('staking_explore_books_cta')"
          variant="outline"
          :to="localeRoute({ name: 'stake-explore' })"
        />
      </div>

      <ul
        v-else-if="hasLoggedIn && stakingItems.length > 0"
        :class="[
          ...gridClasses,
          'w-full',
          'mt-6',
        ]"
      >
        <StakingDashboardItem
          v-for="(item, index) in stakingItems"
          :id="item.nftClassId"
          :key="item.nftClassId"
          :class="getGridItemClassesByIndex(index)"
          :nft-class-id="item.nftClassId"
          :staked-amount="Number(formatUnits(item.stakedAmount, LIKE_TOKEN_DECIMALS))"
          :pending-rewards="Number(formatUnits(item.pendingRewards, LIKE_TOKEN_DECIMALS))"
          :is-owned="item.isOwned"
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

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const toast = useToast()

// Stores
const accountStore = useAccountStore()
const stakingStore = useStakingStore()
const bookshelfStore = useBookshelfStore()

// Constants
const LIKE_TOKEN_DECIMALS = 6

const { restoreConnection } = accountStore

// Contract functions
const { claimWalletRewards } = useLikeCollectiveContract()

// State
const isClaimingAllRewards = ref(false)
const hasMoreItems = ref(false)

const userDisplayName = computed(() => {
  return user.value?.displayName || user.value?.evmWallet
})

// Data from store
const stakingData = computed(() => {
  return user.value?.evmWallet
    ? stakingStore.getUserStakingData(user.value.evmWallet)
    : {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
})

// Merge staking data with owned books
const stakingItems = computed(() => {
  if (!user.value?.evmWallet) return []

  const stakingMap = new Map(
    stakingData.value.items.map(item => [item.nftClassId.toLowerCase(), item]),
  )

  const ownedBooks = bookshelfStore.items
  const mergedItems = []

  // Add all owned books (with or without stakes)
  for (const book of ownedBooks) {
    const stakingItem = stakingMap.get(book.nftClassId)
    mergedItems.push({
      nftClassId: book.nftClassId,
      stakedAmount: stakingItem?.stakedAmount || 0n,
      pendingRewards: stakingItem?.pendingRewards || 0n,
      isOwned: true,
    })
    // Remove from stakingMap to avoid duplicates
    stakingMap.delete(book.nftClassId)
  }

  // Add remaining staked books that user doesn't own
  for (const stakingItem of stakingMap.values()) {
    mergedItems.push(stakingItem)
  }

  // Sort by staked amount descending, then by owned status (owned first)
  return mergedItems.sort((a, b) => {
    if (a.isOwned !== b.isOwned) {
      return a.isOwned ? -1 : 1
    }
    return Number(b.stakedAmount - a.stakedAmount)
  })
})
const totalUnclaimedRewards = computed(() => stakingData.value.totalUnclaimedRewards)
const isLoading = computed(() => stakingData.value.isFetching || bookshelfStore.isFetching)
const hasFetched = computed(() => stakingData.value.hasFetched && bookshelfStore.hasFetched)

const formattedTotalRewards = computed(() => {
  return user.value?.evmWallet ? stakingStore.getFormattedTotalRewards(user.value.evmWallet) : '0'
})

const itemsCount = computed(() => stakingItems.value.length)

const { gridClasses, getGridItemClassesByIndex, columnMax } = usePaginatedGrid({
  itemsCount,
  hasMore: hasMoreItems,
})

useHead(() => ({
  title: $t('staking_dashboard_page_title'),
  meta: [
    {
      name: 'description',
      content: $t('staking_dashboard_page_description'),
    },
    {
      name: 'robots',
      content: 'noindex',
    },
  ],
}))

async function loadStakingData() {
  if (!hasLoggedIn.value || !user.value?.evmWallet) return

  try {
    // Fetch both staking data and owned books
    await Promise.all([
      stakingStore.fetchUserStakingData(user.value.evmWallet, { isRefresh: true }),
      bookshelfStore.fetchItems({ walletAddress: user.value.evmWallet, isRefresh: true }),
    ])
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_dashboard_load_error'),
    })
  }
}

async function handleClaimAllRewards() {
  if (!hasLoggedIn.value) return

  try {
    await restoreConnection()

    isClaimingAllRewards.value = true

    await claimWalletRewards(user.value!.evmWallet)
    await sleep(3000)

    toast.add({
      title: $t('staking_claim_all_rewards_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('claim_all_rewards_success', {
      total_amount: formatUnits(totalUnclaimedRewards.value, LIKE_TOKEN_DECIMALS),
      book_count: stakingItems.value.length,
    })

    // Reload data to refresh rewards
    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_claim_all_rewards_error'),
    })
  }
  finally {
    isClaimingAllRewards.value = false
  }
}

function handleItemClick(nftClassId: string) {
  useLogEvent('staking_dashboard_item_click', {
    nft_class_id: nftClassId,
  })

  navigateTo(localeRoute({
    name: 'stake-nftClassId',
    params: { nftClassId },
  }))
}

onMounted(async () => {
  if (hasLoggedIn.value) {
    await loadStakingData()
  }
})

watch(hasLoggedIn, async (isLoggedIn) => {
  if (isLoggedIn) {
    await loadStakingData()
  }
  else if (user.value?.evmWallet) {
    stakingStore.clearUserStakingData(user.value.evmWallet)
    bookshelfStore.reset()
  }
})
</script>
