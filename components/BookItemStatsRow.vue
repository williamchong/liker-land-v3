<template>
  <div
    :class="[
      'flex',
      'items-center',
      'justify-between',
      { 'opacity-0 pointer-events-none': isHidden },
    ]"
  >
    <span v-text="label" />

    <slot />
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  label?: string
  isHidden?: boolean
}>(), {
  label: '',
  isHidden: false,
})
</script>
