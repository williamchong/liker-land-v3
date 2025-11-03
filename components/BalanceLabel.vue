<template>
  <div :class="{ 'font-semibold': isBold }">
    <span v-text="value" />
    <span v-if="currency">&nbsp;{{ currency }}</span>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
  value?: string | number
  maximumFractionDigits?: number
  currency?: string
  isBold?: boolean
  isCompact?: boolean
}>(), {
  value: 0,
  maximumFractionDigits: 2,
  currency: 'LIKE',
  isBold: true,
  isCompact: false,
})

const value = computed(() => {
  if (typeof props.value === 'string') return props.value

  if (props.isCompact && props.value >= 10_000) {
    const formatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
    })
    return formatter.format(props.value)
  }

  return props.value.toLocaleString(undefined, {
    maximumFractionDigits: props.maximumFractionDigits,
  })
})
</script>
