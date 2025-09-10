<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end cursor-pointer"
    @click="handleClick"
  >
    <div
      :class="[
        'transition-opacity',
        stakedAmount === 0 ? 'opacity-50' : 'opacity-100',
      ]"
    >
      <BookCover
        :src="bookCoverSrc"
        :alt="bookName"
        :lazy="props.lazy"
        @click="handleClick"
      />
    </div>

    <div class="mt-2 h-[70px]">
      <div class="flex items-start gap-1">
        <div
          class="text-sm laptop:text-base text-[#1A1A1A] font-semibold line-clamp-2 grow"
          v-text="bookName"
        />
        <UBadge
          v-if="isOwned"
          :label="$t('staking_dashboard_owned')"
          variant="soft"
          color="primary"
          size="xs"
        />
      </div>

      <div
        class="h-4 laptop:h-5 mt-0.5 text-xs laptop:text-sm text-[#9B9B9B] line-clamp-1"
        v-text="authorName"
      />
    </div>

    <!-- Staking info replacing price section -->
    <div class="mt-3 space-y-1">
      <div class="h-5 text-sm text-theme-500 flex items-center justify-between">
        <span class="font-medium">{{ $t('staking_dashboard_staked') }}</span>
        <div class="flex items-center gap-1">
          <span class="font-semibold">{{ formattedStakedAmount }}</span>
          <span class="text-xs text-gray-500">LIKE</span>
        </div>
      </div>

      <div
        v-if="pendingRewards > 0"
        class="h-4 text-xs text-green-600 flex items-center justify-between"
      >
        <span>{{ $t('staking_dashboard_rewards') }}</span>
        <div class="flex items-center gap-1">
          <span class="font-medium">{{ formattedPendingRewards }}</span>
          <span class="text-xs text-gray-400">LIKE</span>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
const props = defineProps({
  nftClassId: {
    type: String,
    required: true,
  },
  stakedAmount: {
    type: Number,
    required: true,
  },
  pendingRewards: {
    type: Number,
    required: true,
  },
  isOwned: {
    type: Boolean,
    default: false,
  },
  lazy: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['visible', 'click'])

const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const bookName = computed(() => bookInfo.name.value)
const authorName = computed(() => bookInfo.authorName.value)

const formattedStakedAmount = computed(() => {
  return props.stakedAmount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
})

const formattedPendingRewards = computed(() => {
  return props.pendingRewards.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
})

if (!props.lazy) {
  callOnce(`StakingDashboardItem_${props.nftClassId}`, () => {
    emit('visible', props.nftClassId)
    fetchBookInfo()
  })
}
else {
  useVisibility('lazyLoadTrigger', (visible) => {
    if (visible) {
      emit('visible', props.nftClassId)
      fetchBookInfo()
    }
  })
}

function fetchBookInfo() {
  nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => {
    console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
  })
  if (bookInfo.nftClassOwnerWalletAddress.value) {
    metadataStore.lazyFetchLikerInfoByWalletAddress(bookInfo.nftClassOwnerWalletAddress.value).catch(() => {
      console.warn(`Failed to fetch Liker info of the wallet [${bookInfo.nftClassOwnerWalletAddress.value}] for the NFT class [${props.nftClassId}]`)
    })
  }
}

function handleClick() {
  useLogEvent('staking_dashboard_item_select', {
    nft_class_id: props.nftClassId,
    staked_amount: props.stakedAmount.toString(),
    pending_rewards: props.pendingRewards.toString(),
    is_owned: props.isOwned,
  })
  emit('click', props.nftClassId)
}
</script>
