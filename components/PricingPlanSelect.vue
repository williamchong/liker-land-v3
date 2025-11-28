<template>
  <div class="flex flex-col gap-4">
    <!-- Yearly plan -->
    <label
      :class="[
        ...PLAN_LABEL_BASE_CLASS,
        selectedPlan === 'yearly' ? 'border-black' : 'border-gray-200',
      ]"
    >
      <div
        v-if="yearlyDiscountPercent"
        :class="[
          'absolute',
          'top-0',
          'right-4',

          'px-3',
          'py-1',

          'bg-black',

          'text-theme-cyan',
          'text-xs',
          'font-semibold',

          'rounded-lg',

          '-translate-y-1/2',
        ]"
        v-text="$t('pricing_page_yearly_discount', { discount: yearlyDiscountPercent })"
      />

      <div class="flex items-center">
        <div class="w-6 h-6 shrink-0 mr-4">
          <div
            :class="[
              'w-full h-full rounded-full border flex items-center justify-center',
              selectedPlan === 'yearly' ? 'bg-black' : 'bg-white border-gray-300',
            ]"
          >
            <UIcon
              v-show="selectedPlan === 'yearly'"
              name="i-material-symbols-check"
              class="text-theme-cyan"
              :size="16"
            />
          </div>
        </div>
        <div
          class="text-md font-semibold whitespace-nowrap"
          v-text="$t('pricing_page_yearly')"
        />
      </div>
      <div class="text-right">
        <div
          v-if="hasYearlyDiscount"
          class="flex justify-end items-center gap-2 text-sm text-gray-400"
        >
          <p v-text="$t('pricing_page_original_price')" />
          <span
            class="line-through text-gray-400"
            v-text="`US$${originalYearlyPrice}`"
          />
        </div>
        <i18n-t
          keypath="pricing_page_price_per_year"
          tag="div"
          class="flex items-baseline text-sm whitespace-nowrap"
        >
          <template #price>
            <p
              class="text-2xl font-bold px-1"
              v-text="`$${yearlyPrice}`"
            />
          </template>
        </i18n-t>
      </div>
      <input
        v-model="selectedPlan"
        type="radio"
        name="plan"
        value="yearly"
        class="hidden"
      >
    </label>

    <!-- Monthly plan -->
    <label
      :class="[
        ...PLAN_LABEL_BASE_CLASS,
        selectedPlan === 'monthly' ? 'border-black' : 'border-gray-200',
      ]"
    >
      <div class="flex items-center">
        <div class="w-6 h-6 flex-shrink-0 mr-4">
          <div
            class="w-full h-full rounded-full border flex items-center justify-center"
            :class="selectedPlan === 'monthly' ? 'bg-black' : 'bg-white border-gray-300'"
          >
            <UIcon
              v-show="selectedPlan === 'monthly'"
              name="i-material-symbols-check"
              class="text-theme-cyan"
              :size="16"
            />
          </div>
        </div>
        <div
          class="text-md font-semibold whitespace-nowrap"
          v-text="$t('pricing_page_monthly')"
        />
      </div>

      <div class="text-right">
        <div
          v-if="hasMonthlyDiscount"
          class="flex justify-end items-center gap-2 text-sm text-gray-400"
        >
          <p v-text="$t('pricing_page_original_price')" />
          <span
            class="line-through text-gray-400"
            v-text="`US$${originalMonthlyPrice}`"
          />
        </div>
        <i18n-t
          keypath="pricing_page_price_per_month"
          tag="div"
          class="flex items-baseline text-sm whitespace-nowrap"
        >
          <template #price>
            <p
              class="text-2xl font-bold px-1"
              v-text="`$${monthlyPrice}`"
            />
          </template>
        </i18n-t>
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
</template>

<script lang="ts" setup>
const {
  monthlyPrice,
  yearlyPrice,
  originalMonthlyPrice,
  originalYearlyPrice,
  yearlyDiscountPercent,
  hasMonthlyDiscount,
  hasYearlyDiscount,
} = useSubscriptionPricing()

const selectedPlan = defineModel({
  type: String,
  default: 'monthly',
})

const PLAN_LABEL_BASE_CLASS = [
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
  'hover:border-gray-400',
]
</script>
