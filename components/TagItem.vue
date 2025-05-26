<template>
  <div
    :class="[
      'flex',
      'items-center',
      'gap-2',
      'px-3',
      'py-2',
      'text-gray-900',
      'max-tablet:text-sm',
      'font-semibold',
      'rounded-full',
      'border',
      'border-gray-300',
    ]"
  >
    <slot name="prepend" />
    <span v-text="props.label" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  label: {
    type: String,
    default: '',
  },
})
</script>
