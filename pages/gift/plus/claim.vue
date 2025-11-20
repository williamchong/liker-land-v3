<template>
  <div>
    <AppHeader :is-connect-hidden="false" />
    <main class="flex items-center justify-center min-h-screen px-4 py-8">
      <div class="w-full max-w-[512px] text-center">
        <!-- Loading State -->
        <div
          v-if="isLoading"
          class="py-12"
        >
          <UIcon
            name="i-eos-icons-loading"
            class="text-theme-cyan inline-block mb-4"
            size="64"
          />
          <p
            class="text-gray-600"
            v-text="$t('gift_plus_claim_loading')"
          />
        </div>

        <!-- Claim State -->
        <template v-else-if="giftInfo && !error">
          <!-- Gift Icon -->
          <div class="mb-6">
            <UIcon
              name="i-material-symbols-card-giftcard"
              class="text-theme-cyan inline-block"
              size="64"
            />
          </div>

          <!-- Gift Message -->
          <h1
            class="text-2xl font-bold mb-3"
            v-text="$t('gift_plus_claim_title')"
          />
          <p
            class="text-gray-600 text-lg mb-8"
            v-text="$t('gift_plus_claim_description')"
          />

          <!-- Gift Details Card -->
          <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8 text-left">
            <h3 class="font-semibold text-blue-900 mb-4">
              {{ $t('gift_plus_claim_gift_details') }}
            </h3>
            <ul class="space-y-3 text-sm text-blue-800">
              <li class="flex justify-between">
                <span class="font-medium">{{ $t('gift_plus_claim_from') }}:</span>
                <span v-text="giftInfo.fromName || $t('gift_plus_claim_anonymous')" />
              </li>
              <li class="flex justify-between">
                <span class="font-medium">{{ $t('gift_plus_claim_plan') }}:</span>
                <span v-text="period === 'yearly' ? $t('pricing_page_yearly') : $t('pricing_page_monthly')" />
              </li>
            </ul>
          </div>

          <!-- Gift Message Section -->
          <div
            v-if="giftInfo.message"
            class="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8 text-left"
          >
            <h3 class="font-semibold text-amber-900 mb-3">
              {{ $t('gift_plus_claim_message_title') }}
            </h3>
            <p
              class="text-sm text-amber-800 italic"
              v-text="giftInfo.message"
            />
          </div>

          <!-- Already Plus Member State -->
          <template v-if="isExistingPlusMember">
            <UIcon
              name="i-material-symbols-check-circle-rounded"
              class="text-blue-500 inline-block mb-4"
              size="64"
            />
            <h1 class="text-2xl font-bold mb-3 text-blue-600">
              {{ $t('gift_plus_claim_already_member_title') }}
            </h1>
            <p
              class="text-gray-600 mb-8"
              v-text="$t('gift_plus_claim_already_member_description')"
            />
            <UButton
              :label="$t('gift_plus_claim_continue_button')"
              color="primary"
              size="xl"
              class="w-full"
              :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
              @click="handleContinue"
            />
          </template>

          <template v-else>
            <!-- Info Section -->
            <div class="mb-8">
              <div
                class="text-center font-bold text-lg text-theme-cyan border-b-2 border-theme-cyan mb-6 pb-3"
                v-text="$t('gift_plus_claim_info_title')"
              />
              <ul class="space-y-4 text-left">
                <li class="flex items-start gap-3">
                  <UIcon
                    name="i-material-symbols-check"
                    class="shrink-0 mt-0.5 text-theme-cyan"
                    size="20"
                  />
                  <span
                    class="text-sm text-gray-700"
                    v-text="$t('pricing_page_feature_1')"
                  />
                </li>
                <li class="flex items-start gap-3">
                  <UIcon
                    name="i-material-symbols-check"
                    class="shrink-0 mt-0.5 text-theme-cyan"
                    size="20"
                  />
                  <span
                    class="text-sm text-gray-700"
                    v-text="$t('pricing_page_feature_2')"
                  />
                </li>
                <li class="flex items-start gap-3">
                  <UIcon
                    name="i-material-symbols-check"
                    class="shrink-0 mt-0.5 text-theme-cyan"
                    size="20"
                  />
                  <span
                    class="text-sm text-gray-700"
                    v-text="$t('pricing_page_feature_3')"
                  />
                </li>
              </ul>
            </div>

            <!-- Action Buttons -->
            <div
              class="flex flex-col gap-3"
            >
              <UButton
                :label="$t('gift_plus_claim_button')"
                color="primary"
                size="xl"
                :loading="isClaiming"
                class="w-full"
                :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
                @click="handleClaim"
              />
              <UButton
                :label="$t('gift_plus_claim_maybe_later')"
                color="neutral"
                variant="outline"
                size="xl"
                :loading="isRedirecting"
                class="w-full"
                :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
                @click="handleMaybeLater"
              />
            </div>
          </template>
        </template>

        <!-- Error State -->
        <template v-else>
          <UIcon
            name="i-material-symbols-error-outline"
            class="text-red-500 inline-block mb-4"
            size="64"
          />
          <h1 class="text-2xl font-bold mb-3 text-red-600">
            {{ $t('gift_plus_claim_error_title') }}
          </h1>
          <p
            class="text-gray-600 mb-8"
            v-text="error || $t('gift_plus_claim_error_description')"
          />
          <UButton
            :label="$t('gift_plus_claim_retry')"
            color="primary"
            size="xl"
            class="w-full"
            :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
            @click="handleRetry"
          />
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const accountStore = useAccountStore()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const { yearlyPrice, monthlyPrice } = useSubscription()

const getRouteQuery = useRouteQuery()

useHead({
  title: $t('gift_plus_claim_title'),
})

const isLoading = ref(true)
const isClaiming = ref(false)
const isRedirecting = ref(false)
const error = ref<string | null>(null)
const period = ref<SubscriptionPlan>('yearly')
const giftInfo = ref<{
  fromName?: string
  message?: string
} | null>(null)

const isExistingPlusMember = computed(() => hasLoggedIn.value && user.value?.isLikerPlus)

// Extract query parameters
const cartId = computed(() => getRouteQuery('cart_id') as string || '')
const claimingToken = computed(() => getRouteQuery('claiming_token') as string || '')

const giftPrice = computed(() => period.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value)

async function fetchGiftInfo() {
  try {
    isLoading.value = true
    error.value = null

    // Fetch gift cart details to get gift information
    const cartData = await likeCoinSessionAPI.fetchPlusGiftCartStatusById({
      cartId: cartId.value,
      token: claimingToken.value,
    })

    if (cartData?.giftInfo) {
      const { fromName, message } = cartData.giftInfo
      giftInfo.value = {
        fromName,
        message,
      }

      // Extract period from cart data if available
      if (cartData.period && (cartData.period === 'yearly' || cartData.period === 'monthly')) {
        period.value = cartData.period as SubscriptionPlan
      }
    }
    else {
      error.value = $t('gift_plus_claim_fetch_error_description')
    }
  }
  catch (err) {
    error.value = $t('gift_plus_claim_fetch_error_description')
    await handleError(err, {
      title: $t('gift_plus_claim_fetch_error'),
      description: $t('gift_plus_claim_fetch_error_description'),
    })
  }
  finally {
    isLoading.value = false
  }
}

async function handleClaim() {
  // Ensure user is logged in
  if (!hasLoggedIn.value) {
    await accountStore.login()
    if (!hasLoggedIn.value) return
  }

  if (isClaiming.value) return

  try {
    isClaiming.value = true

    // Call the claim API
    await likeCoinSessionAPI.claimPlusGiftCart({
      cartId: cartId.value,
      token: claimingToken.value,
    })

    // Log claim event
    useLogEvent('plus_gift_claimed', {
      transaction_id: cartId.value,
      currency: 'USD',
      value: giftPrice.value,
    })

    // Refresh session info until Plus status is confirmed
    let retries = 0
    const maxRetries = 12 // 60 seconds total with 5 second intervals
    while (!user.value?.isLikerPlus && retries < maxRetries) {
      await sleep(5000)
      await accountStore.refreshSessionInfo()
      retries++
    }

    // Redirect to account page to show new Plus subscription
    await navigateTo(localeRoute({ name: 'account' }))
  }
  catch (err) {
    await handleError(err, {
      title: $t('gift_plus_claim_error_title'),
      description: $t('gift_plus_claim_error_description'),
    })
    isClaiming.value = false
  }
}

async function navigateToPage(routeName: string) {
  isRedirecting.value = true
  try {
    await navigateTo(localeRoute({ name: routeName }))
  }
  catch (err) {
    await handleError(err)
    isRedirecting.value = false
  }
}

async function handleMaybeLater() {
  await navigateToPage('shelf')
}

async function handleContinue() {
  await navigateToPage('account')
}

async function handleRetry() {
  await fetchGiftInfo()
}

onMounted(async () => {
  await fetchGiftInfo()
})
</script>
