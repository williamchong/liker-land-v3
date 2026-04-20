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
import { estimateTTSMinutes } from '~/shared/utils/tts-trial'

const props = defineProps<{
  charactersUsed: number
  limit: number
  isExhausted: boolean
  voiceLanguage?: string
}>()

const emit = defineEmits<{
  click: []
}>()

const { t: $t } = useI18n()

function formatMinutes(chars: number): string {
  const minutes = estimateTTSMinutes(chars, props.voiceLanguage)
  return minutes >= 10
    ? Math.round(minutes).toString()
    : minutes.toFixed(1)
}

const label = computed(() => {
  if (props.isExhausted) {
    return `${$t('tts_trial_chip_exhausted_label')} · ${$t('tts_trial_chip_upgrade_cta')}`
  }
  return $t('tts_trial_chip_progress_label', {
    used: formatMinutes(props.charactersUsed),
    limit: formatMinutes(props.limit),
  })
})
</script>
