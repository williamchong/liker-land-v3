<template>
  <BaseModal
    :title="$t('reader_preview_end_title')"
    :actions="actions"
    @close="(result) => emit('close', result as PreviewEndModalResult | undefined)"
  >
    <template #body>
      <p
        class="text-muted text-sm"
        v-text="$t('reader_preview_end_description')"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import type { BaseModalAction } from './BaseModal.vue'
import type { PreviewEndModalProps, PreviewEndModalResult } from './PreviewEndModal.props'

type PreviewEndModalAction = BaseModalAction & { result: PreviewEndModalResult }

const props = defineProps<PreviewEndModalProps>()

const emit = defineEmits<{ close: [result?: PreviewEndModalResult] }>()

const { t: $t } = useI18n()

const actions = computed<PreviewEndModalAction[]>(() => {
  const list: PreviewEndModalAction[] = [
    {
      label: $t('reader_preview_end_close_button'),
      color: 'neutral',
      variant: 'outline',
      result: 'dismiss',
    },
  ]
  if (props.isPlusReadingEnabled) {
    list.push({
      label: $t('reader_preview_end_subscribe_button'),
      color: 'primary',
      variant: 'outline',
      result: 'subscribe',
    })
  }
  list.push({
    label: $t('reader_preview_end_purchase_button'),
    color: 'primary',
    result: 'purchase',
  })
  return list
})
</script>
