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


      <!-- Books List -->
      <div
        v-if="hasLoggedIn && (stakingItems.length === 0 && !isLoading && hasFetched)"
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

// Constants
const LIKE_TOKEN_DECIMALS = 6

// Contract functions
const {
  getWalletPendingRewardsOfNFTClass,
  getWalletStakeOfNFTClass,
  claimAllRewards,
} = useLikeCollectiveContract()

// State
const isLoading = ref(false)
const hasFetched = ref(false)
const isClaimingAllRewards = ref(false)
const stakingItems = ref<Array<{
  nftClassId: string
  stakedAmount: bigint
  pendingRewards: bigint
  isOwned: boolean
}>>([])
const totalUnclaimedRewards = ref(0n)
const hasMoreItems = ref(false)

const userDisplayName = computed(() => {
  return user.value?.displayName || user.value?.evmWallet
})

const formattedTotalRewards = computed(() => {
  return Number(formatUnits(totalUnclaimedRewards.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
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
    isLoading.value = true

    // Get user's owned books
    const bookshelfStore = useBookshelfStore()
    await bookshelfStore.fetchItems({ walletAddress: user.value.evmWallet, isRefresh: true })

    // Get all books user has staked on (this would need to be implemented in the indexer)
    // For now, we'll use owned books and check their staking status
    const ownedBooks = bookshelfStore.items

    const stakingData = new Map<string, {
      nftClassId: string
      stakedAmount: bigint
      pendingRewards: bigint
      isOwned: boolean
    }>()

    let totalRewards = 0n

    // Check staking status for owned books
    for (const book of ownedBooks) {
      const [stakedAmount, pendingRewards] = await Promise.all([
        getWalletStakeOfNFTClass(user.value.evmWallet, book.nftClassId),
        getWalletPendingRewardsOfNFTClass(user.value.evmWallet, book.nftClassId),
      ])

      if (stakedAmount > 0n || pendingRewards > 0n) {
        stakingData.set(book.nftClassId, {
          nftClassId: book.nftClassId,
          stakedAmount,
          pendingRewards,
          isOwned: true,
        })
        totalRewards += pendingRewards
      }
    }

    // TODO: Get books user has staked on but doesn't own
    // This would require indexer API to return all books a user has staked on

    // Convert to array and sort by staked amount descending
    stakingItems.value = Array.from(stakingData.values()).sort((a, b) => {
      return Number(b.stakedAmount - a.stakedAmount)
    })

    totalUnclaimedRewards.value = totalRewards
    hasFetched.value = true
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_dashboard_load_error'),
    })
  }
  finally {
    isLoading.value = false
  }
}

async function handleClaimAllRewards() {
  if (!hasLoggedIn.value) return

  try {
    isClaimingAllRewards.value = true

    await claimAllRewards()

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
  else {
    stakingItems.value = []
    totalUnclaimedRewards.value = 0n
    hasFetched.value = false
  }
})
</script>
