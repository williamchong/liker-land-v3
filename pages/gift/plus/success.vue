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
            v-text="$t('gift_plus_success_loading')"
          />
        </div>

        <!-- Success State -->
        <template v-else-if="giftInfo && !error">
          <!-- Success Icon -->
          <div class="mb-6">
            <UIcon
              name="i-material-symbols-check-circle-rounded"
              class="text-green-500 inline-block"
              size="64"
            />
          </div>

          <!-- Success Message -->
          <h1
            class="text-2xl font-bold mb-3"
            v-text="$t('gift_plus_success_title')"
          />
          <p
            class="text-gray-600 text-lg mb-8"
            v-text="$t('gift_plus_success_description')"
          />

          <!-- Gift Details Card -->
          <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8 text-left">
            <h3 class="font-semibold text-blue-900 mb-4">
              {{ $t('gift_plus_success_details_title') }}
            </h3>
            <ul class="space-y-3 text-sm text-blue-800">
              <li class="flex justify-between">
                <span class="font-medium">{{ $t('gift_plus_success_to_email') }}:</span>
                <span v-text="giftInfo.toEmail" />
              </li>
              <li
                v-if="giftInfo.toName"
                class="flex justify-between"
              >
                <span class="font-medium">{{ $t('gift_plus_success_to_name') }}:</span>
                <span v-text="giftInfo.toName" />
              </li>
              <li
                v-if="giftInfo.fromName"
                class="flex justify-between"
              >
                <span class="font-medium">{{ $t('gift_plus_success_from_name') }}:</span>
                <span v-text="giftInfo.fromName" />
              </li>
              <li class="flex justify-between">
                <span class="font-medium">{{ $t('gift_plus_success_plan') }}:</span>
                <span v-text="period === 'yearly' ? $t('pricing_page_yearly') : $t('pricing_page_monthly')" />
              </li>
            </ul>
          </div>

          <!-- Info Section -->
          <div class="mb-8">
            <div
              class="text-center font-bold text-lg text-theme-cyan border-b-2 border-theme-cyan mb-6 pb-3"
              v-text="$t('gift_plus_success_info_title')"
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
                  v-text="$t('gift_plus_success_info_item_1')"
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
                  v-text="$t('gift_plus_success_info_item_2')"
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
                  v-text="$t('gift_plus_success_info_item_3')"
                />
              </li>
            </ul>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-3">
            <UButton
              :label="$t('gift_plus_success_gift_another')"
              color="primary"
              size="xl"
              :loading="isRedirecting"
              class="w-full"
              :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
              @click="handleGiftAnother"
            />
            <UButton
              :label="$t('gift_plus_success_continue_button')"
              color="neutral"
              variant="outline"
              size="xl"
              :loading="isRedirecting"
              class="w-full"
              :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
              @click="handleContinue"
            />
          </div>
        </template>

        <!-- Error State -->
        <template v-else>
          <UIcon
            name="i-material-symbols-error-outline"
            class="text-red-500 inline-block mb-4"
            size="64"
          />
          <h1 class="text-2xl font-bold mb-3 text-red-600">
            {{ $t('gift_plus_success_error_title') }}
          </h1>
          <p
            class="text-gray-600 mb-8"
            v-text="error || $t('gift_plus_success_error_description')"
          />
          <UButton
            :label="$t('gift_plus_success_retry')"
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
const { yearlyPrice, monthlyPrice } = useSubscription()

const getRouteQuery = useRouteQuery()

useHead({
  title: $t('gift_plus_success_title'),
})

const isLoading = ref(true)
const isRedirecting = ref(false)
const error = ref<string | null>(null)
const giftInfo = ref<{
  toEmail: string
  toName?: string
  fromName?: string
} | null>(null)

// Extract query parameters
const cartId = computed(() => getRouteQuery('cart_id') as string || '')
const claimingToken = computed(() => getRouteQuery('claiming_token') as string || '')
const paymentId = computed(() => getRouteQuery('payment_id') as string || '')
const period = computed(() => (getRouteQuery('period') as SubscriptionPlan) || 'yearly')
const isRedirected = computed(() => !!getRouteQuery('redirect'))

const giftPrice = computed(() => period.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value)

async function fetchGiftInfo() {
  const maxRetries = 12 // 60 seconds total with 5 second intervals
  let retries = 0

  try {
    while (retries < maxRetries) {
      // Fetch gift cart details to get recipient/sender information
      const cartData = await likeCoinSessionAPI.fetchPlusGiftCartStatusById({
        cartId: cartId.value,
        token: claimingToken.value,
      })

      // If gift cart has a status, we have gift information
      if (cartData?.giftInfo) {
        const { toEmail, toName, fromName } = cartData.giftInfo
        giftInfo.value = {
          toEmail: toEmail || '',
          toName,
          fromName,
        }

        // Log gift purchase event only if redirected from Stripe
        if (isRedirected.value) {
          useLogEvent('purchase', {
            transaction_id: paymentId.value,
            currency: 'USD',
            value: giftPrice.value,
            items: [{
              id: `plus-gift-${period.value}`,
              name: `Plus Gift (${period.value})`,
              price: giftPrice.value,
              quantity: 1,
            }],
            gift_to_email: giftInfo.value.toEmail,
            gift_from_name: giftInfo.value.fromName,
            gift_to_name: giftInfo.value.toName,
          })

          // Remove redirect parameter to prevent duplication on page refresh
          await navigateTo({
            ...useRoute(),
            query: {
              ...useRoute().query,
              redirect: undefined,
            },
          }, { replace: true })
        }

        isLoading.value = false
        return
      }

      // Wait before retrying
      await sleep(5000)
      retries++
    }

    // If we get here, we've exceeded max retries
    error.value = $t('gift_plus_success_fetch_error_description')
    isLoading.value = false
  }
  catch (err) {
    error.value = $t('gift_plus_success_fetch_error_description')
    await handleError(err, {
      title: $t('gift_plus_success_fetch_error'),
      description: $t('gift_plus_success_fetch_error_description'),
    })
    isLoading.value = false
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

async function handleGiftAnother() {
  await navigateToPage('gift-plus')
}

async function handleContinue() {
  await navigateToPage('shelf')
}

async function handleRetry() {
  isLoading.value = true
  error.value = null
  await fetchGiftInfo()
}

onMounted(async () => {
  await fetchGiftInfo()
})
</script>
