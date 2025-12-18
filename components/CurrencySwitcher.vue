<template>
  <USelect
    :model-value="currency"
    :items="currencyItems"
    class="w-32"
    :icon="props.isIconHidden ? undefined : 'i-material-symbols-payments-outline-rounded'"
    trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
    size="md"
    @update:model-value="handleCurrencyChange"
  />
</template>

<script setup lang="ts">
const props = defineProps({
  isIconHidden: Boolean,
})

const { t: $t } = useI18n()
const { currency, setCurrency } = usePaymentCurrency()

const currencyItems = computed(() => [
  { label: `🌐 ${$t('currency_auto')}`, value: 'auto' },
  { label: '🇭🇰 HKD', value: 'hkd' },
  { label: '🇹🇼 TWD', value: 'twd' },
  { label: '🇺🇸 USD', value: 'usd' },
])

function handleCurrencyChange(value: string) {
  setCurrency(value as PaymentCurrency)
  useLogEvent('currency_switch', { currency: value })
}
</script>
