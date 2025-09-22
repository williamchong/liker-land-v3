<template>
  <main class="items-center px-4 laptop:px-12 pb-[100px]">
    <section class="flex flex-col tablet:flex-row gap-[32px] tablet:gap-[44px] w-full max-w-[1200px]">
      <div class="grow pt-5">
        <div class="flex flex-col laptop:flex-row gap-6 laptop:gap-8">
          <BookCover
            class="w-[150px] tablet:w-[130px] laptop:w-[220px] shrink-0"
            :src="bookCoverSrc"
            :alt="bookName"
            :is-vertical-center="true"
            :has-shadow="true"
          />

          <div class="flex flex-col justify-center">
            <h1
              class="text-[24px] text-black laptop:text-[32px] desktop:text-[40px] font-bold leading-[1.2]"
              v-text="bookName"
            />

            <ul
              :class="[
                'flex',
                'flex-wrap',
                'gap-x-[64px]',
                'gap-y-6',
                'mt-6 tablet:mt-8',
                '[&>li>div:first-child]:text-gray-600',
                '[&>li>div:first-child]:text-sm',
                '[&>li>div:first-child]:mb-2',
              ]"
            >
              <li v-if="bookInfo.authorName.value">
                <div v-text="$t('product_page_author_name_label')" />
                <EntityItem :name="bookInfo.authorName.value" />
              </li>
              <li v-if="bookInfo.publisherName.value">
                <div v-text="$t('product_page_publisher_label')" />
                <EntityItem :name="bookInfo.publisherName.value" />
              </li>
              <li>
                <div v-text="$t('staking_total_staked_label')" />
                <div class="flex items-center gap-2">
                  <span class="text-lg font-semibold text-theme-500">
                    {{ formattedTotalStake }}
                  </span>
                  <span class="text-sm text-gray-500">LIKE</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <UTabs
          v-if="infoTabItems.length"
          :items="infoTabItems"
          variant="link"
          class="gap-6 w-full mt-[52px] tablet:mt-[80px]"
          :ui="{ list: 'gap-6 border-0', trigger: 'text-lg font-bold pb-0 px-0', indicator: 'border-1' }"
        >
          <template #description>
            <ExpandableContent>
              <div
                class="markdown"
                v-html="bookInfoDescriptionHTML"
              />
            </ExpandableContent>
          </template>

          <template #author>
            <ExpandableContent>
              <div
                class="markdown"
                v-html="authorDescriptionHTML"
              />
            </ExpandableContent>
          </template>

          <template #staking-info>
            <div class="space-y-4">
              <div class="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                <UCard :ui="{ body: 'p-4' }">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-theme-500">
                      {{ formattedTotalStake }}
                    </div>
                    <div class="text-sm text-gray-600 mt-1">
                      {{ $t('staking_total_staked') }}
                    </div>
                  </div>
                </UCard>
                <UCard
                  v-if="hasLoggedIn"
                  :ui="{ body: 'p-4' }"
                >
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-500">
                      {{ formattedUserStake }}
                    </div>
                    <div class="text-sm text-gray-600 mt-1">
                      {{ $t('staking_your_stake') }}
                    </div>
                    <div
                      v-if="userStakePercentage > 0"
                      class="text-xs text-gray-500 mt-1"
                    >
                      {{ userStakePercentage }}% {{ $t('staking_of_total') }}
                    </div>
                  </div>
                </UCard>
              </div>

              <div
                v-if="hasLoggedIn && pendingRewards > 0n"
                class="mt-4"
              >
                <UCard :ui="{ body: 'p-4' }">
                  <div class="flex justify-between items-center">
                    <div>
                      <div class="text-lg font-semibold text-green-500">
                        {{ formattedPendingRewards }}
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ $t('staking_pending_rewards') }}
                      </div>
                    </div>
                    <UButton
                      :label="$t('staking_claim_rewards')"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      :loading="isClaimingRewards"
                      @click="handleClaimRewards"
                    />
                  </div>
                </UCard>
              </div>
            </div>
          </template>
        </UTabs>

        <ul
          v-if="bookInfo.keywords.value"
          class="hidden tablet:flex flex-wrap gap-x-2 gap-y-4 mt-[48px]"
        >
          <li
            v-for="tag in bookInfo.keywords.value"
            :key="tag"
          >
            <TagItem :label="tag" />
          </li>
        </ul>
      </div>

      <div class="relative w-full tablet:max-w-[300px] laptop:max-w-[380px] shrink-0">
        <div class="sticky top-0 pt-5">
          <div class="bg-white p-4 pb-8 rounded-lg shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)]">
            <h2 v-text="$t('staking_stake_on_book_title')" />

            <!-- Total Stake Display -->
            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
              <div class="text-center">
                <div class="text-3xl font-bold text-theme-500">
                  {{ formattedTotalStake }}
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  {{ $t('staking_total_staked') }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ $t('staking_total_staked_description') }}
                </div>
              </div>
            </div>

            <!-- User Stake Info (logged in only) -->
            <div
              v-if="hasLoggedIn"
              class="mt-4"
            >
              <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <div class="font-semibold text-blue-600">
                    {{ formattedUserStake }}
                  </div>
                  <div class="text-xs text-gray-600">
                    {{ $t('staking_your_current_stake') }}
                  </div>
                </div>
                <div
                  v-if="userStakePercentage > 0"
                  class="text-right"
                >
                  <div class="text-sm font-medium text-blue-600">
                    {{ userStakePercentage }}%
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ $t('staking_of_total') }}
                  </div>
                </div>
              </div>

              <!-- Pending Rewards -->
              <div
                v-if="pendingRewards > 0n"
                class="mt-3 p-3 bg-green-50 rounded-lg"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <div class="font-semibold text-green-600">
                      {{ formattedPendingRewards }}
                    </div>
                    <div class="text-xs text-gray-600">
                      {{ $t('staking_pending_rewards') }}
                    </div>
                  </div>
                  <UButton
                    :label="$t('staking_claim')"
                    color="secondary"
                    variant="outline"
                    size="xs"
                    :loading="isClaimingRewards"
                    @click="handleClaimRewards"
                  />
                </div>
              </div>
            </div>

            <!-- Stake Amount Input (logged in only) -->
            <div
              v-if="hasLoggedIn"
              class="mt-4"
            >
              <UInput
                v-model="stakeAmount"
                type="number"
                :placeholder="$t('staking_amount_placeholder')"
                :min="0"
                step="0.000001"
                class="mb-3"
              >
                <template #trailing>
                  <span class="text-gray-400 text-sm">LIKE</span>
                </template>
              </UInput>

              <div class="flex gap-2 mb-4">
                <UButton
                  v-for="amount in quickAmounts"
                  :key="amount"
                  :label="`${amount}`"
                  variant="outline"
                  size="xs"
                  @click="stakeAmount = amount.toString()"
                />
              </div>
            </div>

            <!-- CTA Buttons -->
            <footer class="flex flex-col gap-3">
              <UButton
                v-if="!hasLoggedIn"
                :label="$t('staking_connect_wallet_to_stake')"
                size="xl"
                block
                @click="handleConnectWallet"
              />
              <template v-else>
                <UButton
                  :label="$t('staking_stake_button')"
                  size="xl"
                  :loading="isStaking"
                  :disabled="(!isValidStakeAmount && stakeAmount.length > 0) || isStaking"
                  block
                  @click="handleStake"
                />
                <UButton
                  v-if="userStake > 0n"
                  :label="$t('staking_unstake_button')"
                  variant="outline"
                  size="xl"
                  :loading="isUnstaking"
                  :disabled="(!isValidUnstakeAmount && stakeAmount.length > 0) || isUnstaking"
                  block
                  @click="handleUnstake"
                />
              </template>
            </footer>
          </div>

          <ul class="flex justify-center items-center gap-2 mt-4">
            <li
              v-for="button in socialButtons"
              :key="button.icon"
            >
              <UTooltip
                :delay-duration="0"
                :text="button.label"
              >
                <UButton
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :icon="button.icon"
                  :disabled="!button.isEnabled"
                  :ui="{ base: 'p-2 rounded-full' }"
                  @click="handleSocialButtonClick(button.key)"
                />
              </UTooltip>
            </li>
          </ul>
        </div>
      </div>

      <ul
        v-if="bookInfo.keywords.value"
        class="flex tablet:hidden flex-wrap gap-x-2 gap-y-3"
      >
        <li
          v-for="tag in bookInfo.keywords.value"
          :key="tag"
        >
          <TagItem :label="tag" />
        </li>
      </ul>
    </section>

    <!-- Mobile sticky stake bar -->
    <aside
      :class="[
        'fixed',
        'bottom-[56px]',
        'inset-x-4',
        isStakeInfoVisible ? 'hidden' : 'flex',
        'tablet:hidden',
        'gap-4',
        'justify-between',
        'items-center',
        'mb-3',
        'px-5',
        'py-3',
        'rounded-xl',
        'bg-white',
        'shadow-[0px_10px_30px_0px_rgba(0,0,0,0.12)]',
        'z-10',
      ]"
    >
      <span class="text-theme-500">
        <span class="text-xs mr-0.5">LIKE</span>
        <span class="text-2xl font-semibold">{{ formattedTotalStake }}</span>
      </span>
      <UButton
        :label="hasLoggedIn ? $t('staking_stake_button') : $t('staking_connect_wallet')"
        class="cursor-pointer max-w-[248px]"
        color="primary"
        size="xl"
        :loading="isStaking"
        :disabled="hasLoggedIn ? ((!isValidStakeAmount && stakeAmount.length > 0) || isStaking) : false"
        block
        @click="hasLoggedIn ? handleStake : handleConnectWallet"
      />
    </aside>
  </main>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import MarkdownIt from 'markdown-it'
import { formatUnits, parseUnits } from 'viem'

const route = useRoute()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const localeRoute = useLocaleRoute()
const getRouteBaseName = useRouteBaseName()
const getRouteParam = useRouteParam()
const { t: $t } = useI18n()
const toast = useToast()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const { handleError } = useErrorHandler()
const { getResizedImageURL } = useImageResize()

const nftClassId = computed(() => getRouteParam('nftClassId'))
const {
  generateBookStructuredData,
} = useStructuredData({ nftClassId })

const LIKE_TOKEN_DECIMALS = 6

const {
  getWalletPendingRewardsOfNFTClass,
  getWalletStakeOfNFTClass,
  getTotalStakeOfNFTClass,
  stakeToNFTClass,
} = useLikeCollectiveContract()

const {
  unstakeFromNFTClass,
  claimWalletRewardsOfNFTClass,
} = useLikeStaking()

if (nftClassId.value !== nftClassId.value.toLowerCase()) {
  await navigateTo(localeRoute({
    name: getRouteBaseName(route),
    params: { nftClassId: nftClassId.value.toLowerCase() },
    query: route.query,
  }), { replace: true })
}

await callOnce(async () => {
  try {
    await nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value)
  }
  catch (error) {
    await handleError(error, {
      isFatal: true,
      customHandlerMap: {
        404: {
          description: $t('product_page_not_found_error'),
        },
        500: {
          description: $t('product_page_fetch_metadata_failed_error'),
        },
      },
      logPrefix: 'Stake Page',
    })
  }
})

const bookInfo = useBookInfo({ nftClassId })
const authorStore = useAuthorStore()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 600 }))

// Staking state
const totalStake = ref(0n)
const userStake = ref(0n)
const pendingRewards = ref(0n)
const stakeAmount = ref('')
const isStaking = ref(false)
const isUnstaking = ref(false)
const isClaimingRewards = ref(false)

// Load staking data
async function loadStakingData() {
  try {
    totalStake.value = await getTotalStakeOfNFTClass(nftClassId.value)

    if (hasLoggedIn.value && user.value?.evmWallet) {
      const [userStakeAmount, pendingRewardsAmount] = await Promise.all([
        getWalletStakeOfNFTClass(user.value.evmWallet, nftClassId.value),
        getWalletPendingRewardsOfNFTClass(user.value.evmWallet, nftClassId.value),
      ])
      userStake.value = userStakeAmount
      pendingRewards.value = pendingRewardsAmount
    }
  }
  catch (error) {
    console.error('Failed to load staking data:', error)
  }
}

// Computed values
const formattedTotalStake = computed(() => {
  return Number(formatUnits(totalStake.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
})

const formattedUserStake = computed(() => {
  return Number(formatUnits(userStake.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
})

const formattedPendingRewards = computed(() => {
  return Number(formatUnits(pendingRewards.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
})

const userStakePercentage = computed(() => {
  if (totalStake.value === 0n) return 0
  return Math.round((Number(userStake.value) / Number(totalStake.value)) * 10000) / 100
})

const quickAmounts = [1, 10, 100, 1000]

const isValidStakeAmount = computed(() => {
  const amount = String(stakeAmount.value || '').trim()
  return amount && !isNaN(Number(amount)) && Number(amount) > 0
})

const isValidUnstakeAmount = computed(() => {
  const amount = String(stakeAmount.value || '').trim()
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return false
  try {
    return parseUnits(amount, LIKE_TOKEN_DECIMALS) <= userStake.value
  }
  catch {
    return false
  }
})

const ogTitle = computed(() => {
  const title = bookInfo.name.value
  const author = bookInfo.authorName.value
  return author ? `${$t('staking_page_title_with_book', { title, author })}` : `${$t('staking_page_title_with_book', { title })}`
})

const ogDescription = computed(() => {
  return $t('staking_page_description_with_book', {
    title: bookInfo.name.value,
    stake: formattedTotalStake.value,
  })
})

const canonicalURL = computed(() => {
  return `${baseURL}${route.path}`
})

const structuredData = computed(() => {
  return generateBookStructuredData({
    canonicalURL: canonicalURL.value,
  })
})

const meta = [
  { name: 'description', content: ogDescription.value },
  { property: 'og:title', content: ogTitle.value },
  { property: 'og:description', content: ogDescription.value },
  { property: 'og:image', content: bookInfo.coverSrc.value },
  { property: 'og:url', content: canonicalURL.value },
]

if (bookInfo.isHidden.value) {
  meta.push({ name: 'robots', content: 'noindex, nofollow' })
}

useHead(() => ({
  title: ogTitle.value,
  meta,
  link: [
    { rel: 'canonical', href: canonicalURL.value },
    { rel: 'preload', href: bookCoverSrc.value, as: 'image' },
  ],
  script: structuredData.value
    ? [
        { type: 'application/ld+json', innerHTML: JSON.stringify(structuredData.value) },
      ]
    : [],
}))

const bookInfoDescriptionHTML = computed(() => {
  return md.render(bookInfo.description?.value || '')
})

const authorDescriptionHTML = computed(() => {
  return md.render(bookInfo.authorDescription?.value || '')
})

const infoTabItems = computed(() => {
  const items: TabsItem[] = []

  if (bookInfo.description.value) {
    items.push({
      label: $t('product_page_info_tab_description'),
      slot: 'description',
    })
  }

  if (bookInfo.authorDescription.value) {
    items.push({
      label: $t('product_page_info_tab_author_description'),
      slot: 'author',
    })
  }

  items.push({
    label: $t('staking_info_tab_staking_info'),
    slot: 'staking-info',
  })

  return items
})

const stakeInfoElement = useTemplateRef<HTMLDivElement>('stakeInfo')
const isStakeInfoVisible = useElementVisibility(stakeInfoElement)

const bookName = computed(() => bookInfo.name.value)

const socialButtons = computed(() => [
  { key: 'copy-links', label: $t('share_button_hint_copy_link'), icon: 'i-material-symbols-link-rounded', isEnabled: true },
  { key: 'threads', label: $t('share_button_hint_threads'), icon: 'i-simple-icons-threads' },
  { key: 'facebook', label: $t('share_button_hint_facebook'), icon: 'i-simple-icons-facebook' },
  { key: 'whatsapp', label: $t('share_button_hint_whatsapp'), icon: 'i-simple-icons-whatsapp' },
  { key: 'x', label: $t('share_button_hint_x'), icon: 'i-simple-icons-x' },
])

onMounted(async () => {
  useLogEvent('view_stake_page', { nft_class_id: nftClassId.value })

  const ownerWalletAddress = bookInfo.nftClassOwnerWalletAddress.value
  if (ownerWalletAddress) {
    metadataStore.lazyFetchLikerInfoByWalletAddress(ownerWalletAddress).catch((error) => {
      console.error(`Failed to fetch owner liker info for wallet address ${ownerWalletAddress}:`, error)
    })
    authorStore.lazyFetchBookClassByOwnerWallet(ownerWalletAddress).catch((error) => {
      console.error(`Failed to fetch author owned class for wallet address ${ownerWalletAddress}:`, error)
    })
  }

  await loadStakingData()
})

watch(hasLoggedIn, async (isLoggedIn) => {
  if (isLoggedIn) {
    await loadStakingData()
  }
  else {
    userStake.value = 0n
    pendingRewards.value = 0n
  }
})

async function handleConnectWallet() {
  try {
    await accountStore.login()
    useLogEvent('stake_connect_wallet', { nft_class_id: nftClassId.value })
  }
  catch (error) {
    await handleError(error)
  }
}

async function handleStake() {
  const amountString = String(stakeAmount.value || '').trim()

  if (!amountString) {
    toast.add({
      title: $t('staking_please_enter_amount'),
      color: 'warning',
      icon: 'i-material-symbols-warning-outline',
    })
    return
  }

  if (!isValidStakeAmount.value) return

  try {
    isStaking.value = true
    const amount = parseUnits(amountString, LIKE_TOKEN_DECIMALS)

    await stakeToNFTClass(nftClassId.value, amount)

    toast.add({
      title: $t('staking_stake_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('stake_success', {
      nft_class_id: nftClassId.value,
      amount: amountString,
    })

    stakeAmount.value = ''
    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_stake_error'),
    })
  }
  finally {
    isStaking.value = false
  }
}

async function handleUnstake() {
  const amountString = String(stakeAmount.value || '').trim()

  if (!amountString) {
    toast.add({
      title: $t('staking_please_enter_amount'),
      color: 'warning',
      icon: 'i-material-symbols-warning-outline',
    })
    return
  }

  if (!isValidUnstakeAmount.value) return

  try {
    isUnstaking.value = true
    await unstakeFromNFTClass(user.value!.evmWallet, nftClassId.value)

    toast.add({
      title: $t('staking_unstake_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('unstake_success', {
      nft_class_id: nftClassId.value,
      amount: amountString,
    })

    stakeAmount.value = ''
    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_unstake_error'),
    })
  }
  finally {
    isUnstaking.value = false
  }
}

async function handleClaimRewards() {
  try {
    isClaimingRewards.value = true

    await claimWalletRewardsOfNFTClass(user.value!.evmWallet, nftClassId.value)

    toast.add({
      title: $t('staking_claim_rewards_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('claim_rewards_success', {
      nft_class_id: nftClassId.value,
      amount: formatUnits(pendingRewards.value, LIKE_TOKEN_DECIMALS),
    })

    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_claim_rewards_error'),
    })
  }
  finally {
    isClaimingRewards.value = false
  }
}

async function handleSocialButtonClick(key: string) {
  switch (key) {
    case 'copy-links':
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.add({
          title: $t('copy_link_success'),
          duration: 3000,
          icon: 'i-material-symbols-link-rounded',
          color: 'success',
        })
      }
      catch (error) {
        console.error('Failed to copy link:', error)
        toast.add({
          title: $t('copy_link_failed'),
          icon: 'i-material-symbols-error-circle-rounded',
          duration: 3000,
          color: 'error',
        })
      }
      break
    case 'threads':
      // TODO: Handle Threads
      break
    case 'facebook':
      // TODO: Handle Facebook
      break
    case 'whatsapp':
      // TODO: Handle WhatsApp
      break
    case 'x':
      // TODO: Handle X
      break
    default:
  }
}
</script>
