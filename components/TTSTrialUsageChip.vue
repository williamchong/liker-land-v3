<template>
  <UButton
    class="rounded-full"
    :label="label"
    :icon="isExhausted ? 'i-material-symbols-lock-outline' : 'i-material-symbols-volume-up-outline-rounded'"
    :color="isExhausted ? 'error' : 'primary'"
    variant="soft"
    size="sm"
    @click="emit('click')"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  minutesRemaining: number
  isExhausted: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const { t: $t } = useI18n()

const label = computed(() => {
  if (props.isExhausted) {
    return `${$t('tts_trial_chip_exhausted_label')} · ${$t('tts_trial_chip_upgrade_cta')}`
  }
  return $t('tts_trial_chip_progress_label', { minutes: props.minutesRemaining })
})
</script>
