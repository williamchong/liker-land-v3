<template>
  <div class="flex flex-col gap-4">
    <label
      v-for="plan in plans"
      :key="plan.value"
      :class="[
        'relative',

        'flex',
        'justify-between',
        'items-center',

        'px-4',
        'py-4',

        'hover:bg-theme-black/5',
        'text-theme-black',
        'rounded-2xl',

        'border-2',
        plan.isSelected ? 'border-theme-black' : 'border-gray-200',

        'hover:shadow-lg',
        'hover:-translate-y-0.5',

        'cursor-pointer',

        'transition-all',
        'duration-200',
        'ease-in-out',

      ]"
    >
      <aside
        v-if="plan.discountPercent"
        :class="[
          'absolute',
          'top-0',
          'right-4',

          'px-3',
          'py-1',

          'bg-theme-black',

          'text-theme-cyan',
          'text-xs',
          'font-semibold',

          'rounded-lg',

          '-translate-y-1/2',
        ]"
        v-text="$t('pricing_page_yearly_discount', { discount: plan.discountPercent })"
      />

      <div class="flex items-center">
        <div
          :class="[
            'size-5 shrink-0 mr-4 rounded-full border-2',
            plan.isSelected ? 'bg-theme-black border-theme-black' : 'bg-transparent border-gray-200',
          ]"
        >
          <UIcon
            v-show="plan.isSelected"
            name="i-material-symbols-check"
            class="block text-theme-cyan"
            :size="16"
          />
        </div>

        <span
          class="text-md font-semibold whitespace-nowrap"
          v-text="plan.label"
        />
      </div>

      <div class="text-sm text-right">
        <span
          v-if="plan.hasDiscount"
          class="text-muted after:content-['_']"
        >
          <span>{{ $t('pricing_page_original_price') }}&nbsp;</span>
          <span class="line-through text-muted">{{ currency }} ${{ plan.originalPrice }}</span>
        </span>

        <span class="font-bold whitespace-nowrap">
          <span>{{ currency }}&nbsp;</span>
          <span
            class="text-2xl"
            v-text="`$${plan.price}`"
          />
          <span>/{{ plan.perUnit }}</span>
        </span>
      </div>

      <input
        v-model="selectedPlan"
        type="radio"
        name="plan"
        :value="plan.value"
        class="hidden"
      >
    </label>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  currency?: string
}>(), {
  currency: 'US',
})

const { t: $t } = useI18n()

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
  default: 'yearly',
})

const plans = computed(() => ['yearly', 'monthly'].map((value) => {
  const isMonthly = value === 'monthly'
  return {
    isSelected: selectedPlan.value === value,
    value,
    label: isMonthly ? $t('pricing_page_monthly') : $t('pricing_page_yearly'),
    perUnit: isMonthly ? $t('pricing_page_price_per_month') : $t('pricing_page_price_per_year'),
    price: isMonthly ? monthlyPrice.value : yearlyPrice.value,
    originalPrice: isMonthly ? originalMonthlyPrice.value : originalYearlyPrice.value,
    hasDiscount: isMonthly ? hasMonthlyDiscount.value : hasYearlyDiscount.value,
    discountPercent: isMonthly ? null : yearlyDiscountPercent.value,
  }
}))
</script>
