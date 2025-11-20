<template>
  <div>
    <AppHeader :is-connect-hidden="false" />
    <main class="flex items-center justify-center min-h-screen px-4 py-8">
      <div class="w-full max-w-[512px]">
        <!-- Header Section -->
        <div class="mb-8 text-center">
          <h1
            class="text-3xl font-bold mb-3"
            v-text="$t('gift_plus_title')"
          />
          <p
            class="text-gray-600 text-lg"
            v-text="$t('gift_plus_description')"
          />
        </div>

        <!-- Plus Benefits Section -->
        <div class="mb-8">
          <div
            class="text-center font-bold text-lg text-theme-cyan border-b-2 border-theme-cyan mb-6 pb-3"
            v-text="$t('pricing_page_subscription')"
          />
          <ul class="space-y-4 text-left mb-8">
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
            <li class="flex items-start gap-3">
              <UIcon
                name="i-material-symbols-check"
                class="shrink-0 mt-0.5 text-theme-cyan"
                size="20"
              />
              <span
                class="text-sm text-gray-700"
                v-text="$t('pricing_page_feature_4')"
              />
            </li>
          </ul>
        </div>

        <!-- Gift Form Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 laptop:p-8">
          <!-- Recipient Email -->
          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-900 mb-3">
              {{ $t('gift_plus_recipient_email') }}
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.toEmail"
              type="email"
              :placeholder="$t('gift_plus_recipient_email_placeholder')"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-0 transition-colors"
              :disabled="isProcessing"
            >
            <p
              v-if="errors.toEmail"
              class="mt-2 text-sm text-red-500 font-medium"
              v-text="errors.toEmail"
            />
          </div>

          <!-- Recipient Name -->
          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-900 mb-3">
              {{ $t('gift_plus_recipient_name') }}
            </label>
            <input
              v-model="formData.toName"
              type="text"
              :placeholder="$t('gift_plus_recipient_name_placeholder')"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-0 transition-colors"
              :disabled="isProcessing"
            >
          </div>

          <!-- Sender Name -->
          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-900 mb-3">
              {{ $t('gift_plus_sender_name') }}
            </label>
            <input
              v-model="formData.fromName"
              type="text"
              :placeholder="$t('gift_plus_sender_name_placeholder')"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-0 transition-colors"
              :disabled="isProcessing"
            >
          </div>

          <!-- Gift Message -->
          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-900 mb-3">
              {{ $t('gift_plus_message') }}
            </label>
            <textarea
              v-model="formData.message"
              :placeholder="$t('gift_plus_message_placeholder')"
              rows="4"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-0 transition-colors resize-none"
              :disabled="isProcessing"
            />
            <p
              class="mt-2 text-xs text-gray-500"
              v-text="$t('gift_plus_message_optional')"
            />
          </div>

          <!-- Plan Selection -->
          <div class="mb-8">
            <h3 class="text-sm font-semibold text-gray-900 mb-4">
              {{ $t('gift_plus_plan_selection') }}
            </h3>
            <div class="flex flex-col gap-4">
              <!-- Yearly Plan -->
              <label
                :class="[
                  'relative',
                  'flex',
                  'justify-between',
                  'items-center',
                  'px-4',
                  'py-4',
                  'rounded-2xl',
                  'border-2',
                  'cursor-pointer',
                  'transition-all',
                  'duration-200',
                  'ease-in-out',
                  'hover:shadow-lg',
                  selectedPlan === 'yearly' ? 'border-black' : 'border-gray-200 hover:border-gray-400',
                ]"
              >
                <div
                  v-if="yearlyDiscountPercent"
                  class="absolute -top-3 left-1/4 -translate-x-1/2 bg-black text-theme-cyan text-xs font-semibold px-3 py-1 rounded-lg"
                  v-text="$t('pricing_page_yearly_discount', { discount: yearlyDiscountPercent })"
                />

                <div class="flex items-center">
                  <div class="w-6 h-6 shrink-0 mr-4">
                    <div
                      :class="[
                        'w-full h-full rounded-full border-2 flex items-center justify-center transition-all',
                        selectedPlan === 'yearly'
                          ? 'bg-black border-black'
                          : 'bg-white border-gray-300',
                      ]"
                    >
                      <UIcon
                        v-if="selectedPlan === 'yearly'"
                        name="i-material-symbols-check"
                        class="text-theme-cyan"
                        size="16"
                      />
                    </div>
                  </div>
                  <div
                    class="text-md font-semibold whitespace-nowrap"
                    v-text="$t('pricing_page_yearly')"
                  />
                </div>

                <div class="text-right">
                  <div class="text-2xl font-bold">
                    {{ $t('gift_plus_price_yearly', { price: yearlyPrice }) }}
                  </div>
                </div>

                <input
                  v-model="selectedPlan"
                  type="radio"
                  name="plan"
                  value="yearly"
                  class="hidden"
                >
              </label>

              <!-- Monthly Plan -->
              <label
                :class="[
                  'relative',
                  'flex',
                  'justify-between',
                  'items-center',
                  'px-4',
                  'py-4',
                  'rounded-2xl',
                  'border-2',
                  'cursor-pointer',
                  'transition-all',
                  'duration-200',
                  'ease-in-out',
                  'hover:shadow-lg',
                  selectedPlan === 'monthly' ? 'border-black' : 'border-gray-200 hover:border-gray-400',
                ]"
              >
                <div class="flex items-center">
                  <div class="w-6 h-6 shrink-0 mr-4">
                    <div
                      :class="[
                        'w-full h-full rounded-full border-2 flex items-center justify-center transition-all',
                        selectedPlan === 'monthly'
                          ? 'bg-black border-black'
                          : 'bg-white border-gray-300',
                      ]"
                    >
                      <UIcon
                        v-if="selectedPlan === 'monthly'"
                        name="i-material-symbols-check"
                        class="text-theme-cyan"
                        size="16"
                      />
                    </div>
                  </div>
                  <div
                    class="text-md font-semibold whitespace-nowrap"
                    v-text="$t('pricing_page_monthly')"
                  />
                </div>

                <div class="text-right">
                  <div class="text-2xl font-bold">
                    {{ $t('gift_plus_price_monthly', { price: monthlyPrice }) }}
                  </div>
                </div>

                <input
                  v-model="selectedPlan"
                  type="radio"
                  name="plan"
                  value="monthly"
                  class="hidden"
                >
              </label>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-3">
            <UButton
              :label="$t('gift_plus_checkout_button')"
              color="primary"
              size="xl"
              :loading="isProcessing"
              :disabled="!isFormValid || isProcessing"
              class="w-full"
              :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
              @click="handleCheckout"
            />
            <UButton
              :label="$t('common_cancel')"
              color="neutral"
              variant="outline"
              size="xl"
              :disabled="isProcessing"
              class="w-full"
              :ui="{ base: 'py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
              @click="handleCancel"
            />
          </div>
        </div>

        <!-- Info Section -->
        <div class="mt-8">
          <div
            class="text-center font-bold text-lg text-theme-cyan border-b-2 border-theme-cyan mb-6 pb-3"
            v-text="$t('gift_plus_info_title')"
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
                v-text="$t('gift_plus_info_item_1')"
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
                v-text="$t('gift_plus_info_item_2')"
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
                v-text="$t('gift_plus_info_item_3')"
              />
            </li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const { yearlyPrice, monthlyPrice } = useSubscription()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()

useHead({
  title: $t('gift_plus_page_title'),
  meta: [
    { name: 'description', content: $t('gift_plus_description') },
  ],
})

const selectedPlan = ref<SubscriptionPlan>('yearly')
const isProcessing = ref(false)

const formData = reactive({
  toEmail: '',
  toName: '',
  fromName: '',
  message: '',
})

const errors = reactive({
  toEmail: '',
})

const yearlyDiscountPercent = computed(() => {
  if (!monthlyPrice.value || !yearlyPrice.value) return 0
  const monthlyTotal = monthlyPrice.value * 12
  const discount = ((monthlyTotal - yearlyPrice.value) / monthlyTotal) * 100
  return Math.round(discount)
})

const isFormValid = computed(() => {
  return (
    formData.toEmail
    && !errors.toEmail
  )
})

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

async function handleCheckout() {
  // Validate email
  if (!validateEmail(formData.toEmail)) {
    errors.toEmail = $t('gift_plus_invalid_email')
    return
  }

  // Ensure user is logged in
  if (!hasLoggedIn.value) {
    await accountStore.login()
    if (!hasLoggedIn.value) return
  }

  if (isProcessing.value) return

  try {
    isProcessing.value = true

    const { url } = await likeCoinSessionAPI.fetchLikerPlusGiftCheckoutLink({
      period: selectedPlan.value,
      giftInfo: {
        toEmail: formData.toEmail,
        toName: formData.toName || undefined,
        fromName: formData.fromName || undefined,
        message: formData.message || undefined,
      },
      utmCampaign: 'gift_plus',
      utmSource: 'website',
      utmMedium: 'web',
    })

    // Redirect to Stripe checkout
    if (url) {
      window.location.href = url
    }
  }
  catch (error) {
    await handleError(error, {
      title: $t('gift_plus_checkout_error'),
      description: $t('gift_plus_checkout_error_description'),
    })
  }
  finally {
    isProcessing.value = false
  }
}

function handleCancel() {
  navigateTo(localeRoute({ name: 'store' }))
}

onMounted(() => {
  // Prefill sender name if user is logged in
  if (hasLoggedIn.value && user.value?.displayName) {
    formData.fromName = user.value.displayName
  }
})
</script>
