<template>
  <div class="flex flex-col gap-3 laptop:gap-4">
    <label
      v-for="plan in plans"
      :key="plan.value"
      :class="[
        'relative',

        'flex',
        'justify-between',
        'items-center',

        'px-4',
        'py-3 laptop:py-4',

        'hover:bg-theme-black/5',
        'text-theme-black',
        'rounded-lg',

        'border-2',
        plan.isSelected ? 'border-theme-black' : 'border-theme-black/40',

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

          'px-1.5 laptop:px-3',
          'py-0.5 laptop:py-1',

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
            plan.isSelected ? 'bg-theme-black border-theme-black' : 'bg-transparent border-theme-black/40',
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

      <div class="text-xs laptop:text-sm text-right">
        <div
          v-if="plan.hint"
          class="text-muted"
          v-text="plan.hint"
        />

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
            class="text-lg laptop:text-2xl"
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
const props = withDefaults(defineProps<{
  isYearlyHidden?: boolean
  isMonthlyHidden?: boolean
  trialPeriodDays?: number
  trialPrice?: number
}>(), {
  isYearlyHidden: false,
  isMonthlyHidden: false,
  trialPeriodDays: 30,
  trialPrice: 1,
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
  currency,
} = useSubscriptionPricing()

const selectedPlan = defineModel({
  type: String,
  default: 'yearly',
})

const isTrialFor30Days = computed(() => props.trialPeriodDays === 30)

const plans = computed(() => {
  const values: SubscriptionPlan[] = []
  if (!props.isYearlyHidden) {
    values.push('yearly')
  }
  if (!props.isMonthlyHidden) {
    values.push('monthly')
  }
  return values.map((value) => {
    const isMonthly = value === 'monthly'
    let hint: string | undefined
    if (isTrialFor30Days.value) {
      const hintI18nNames = {
        days: props.trialPeriodDays,
        currency: currency.value,
        price: props.trialPrice,
      }
      hint = isMonthly
        ? $t('plus_subscribe_cta_monthly_trial_with_price', hintI18nNames)
        : $t('plus_subscribe_cta_yearly_trial_with_price', hintI18nNames)
    }
    return {
      isSelected: selectedPlan.value === value,
      value,
      label: isMonthly ? $t('pricing_page_monthly') : $t('pricing_page_yearly'),
      hint,
      perUnit: isMonthly ? $t('pricing_page_price_per_month') : $t('pricing_page_price_per_year'),
      price: isMonthly ? monthlyPrice.value : yearlyPrice.value,
      originalPrice: isMonthly ? originalMonthlyPrice.value : originalYearlyPrice.value,
      hasDiscount: isMonthly ? hasMonthlyDiscount.value : hasYearlyDiscount.value,
      discountPercent: isMonthly ? null : yearlyDiscountPercent.value,
    }
  })
})
</script>
