<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end cursor-pointer"
    @click="handleClick"
  >
    <BookCover
      :src="bookCoverSrc"
      :alt="bookName"
      :lazy="props.lazy"
      @click="handleClick"
    />

    <div class="mt-2 h-[70px]">
      <div class="flex items-start gap-1">
        <div
          class="text-sm laptop:text-base text-[#1A1A1A] font-semibold line-clamp-2 grow"
          v-text="bookName"
        />
        <UBadge
          v-if="hasLoggedIn && userStakedAmount > 0"
          :label="$t('staking_explore_you_staked')"
          variant="soft"
          color="success"
          size="xs"
        />
      </div>

      <div
        class="h-4 laptop:h-5 mt-0.5 text-xs laptop:text-sm text-[#9B9B9B] line-clamp-1"
        v-text="authorName"
      />
    </div>

    <!-- Total staking info for exploration -->
    <div class="mt-3 space-y-1">
      <div class="h-5 text-sm text-theme-500 flex items-center justify-between">
        <span class="font-medium">{{ $t('staking_explore_total_staked') }}</span>
        <div class="flex items-center gap-1">
          <span class="font-semibold">{{ formattedTotalStaked }}</span>
          <span class="text-xs text-gray-500">LIKE</span>
        </div>
      </div>

      <div class="h-4 text-xs text-gray-600 flex items-center justify-between">
        <span>{{ $t('staking_explore_stakers') }}</span>
        <span class="font-medium">{{ stakerCount }}</span>
      </div>

      <!-- User's personal stake if logged in and has staked -->
      <div
        v-if="hasLoggedIn && userStakedAmount > 0"
        class="h-4 text-xs text-green-600 flex items-center justify-between"
      >
        <span>{{ $t('staking_explore_your_stake') }}</span>
        <div class="flex items-center gap-1">
          <span class="font-medium">{{ formattedUserStaked }}</span>
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
  totalStaked: {
    type: Number,
    required: true,
  },
  stakerCount: {
    type: Number,
    required: true,
  },
  userStakedAmount: {
    type: Number,
    default: 0,
  },
  lazy: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['visible', 'click'])

const { loggedIn: hasLoggedIn } = useUserSession()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const bookName = computed(() => bookInfo.name.value)
const authorName = computed(() => bookInfo.authorName.value)

const formattedTotalStaked = computed(() => {
  return props.totalStaked.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
})

const formattedUserStaked = computed(() => {
  return props.userStakedAmount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
})

if (!props.lazy) {
  callOnce(`StakingExploreItem_${props.nftClassId}`, () => {
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
  useLogEvent('staking_explore_item_select', {
    nft_class_id: props.nftClassId,
    total_staked: props.totalStaked.toString(),
    staker_count: props.stakerCount,
    user_staked: props.userStakedAmount.toString(),
  })
  emit('click', props.nftClassId)
}
</script>
