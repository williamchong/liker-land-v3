<template>
  <header
    :class="[
      'flex',
      'items-center',
      'justify-between',
      'gap-4',

      'min-h-[56px]',
      'px-3', 'phone:px-5',

      'bg-white dark:bg-theme-black',
      'border-b',
      'border-gray-500',
    ]"
  >
    <div class="flex items-center gap-4 min-w-0">
      <UButton
        class="-mx-2 shrink-0"
        color="neutral"
        variant="ghost"
        size="xl"
        icon="i-material-symbols-arrow-back-rounded"
        :aria-label="props.backTo ? $t('reader_back_to_store_button') : $t('reader_back_to_shelf_button')"
        :to="backRoute"
      />

      <div class="flex flex-col overflow-hidden min-w-0">
        <div
          :class="[
            'text-muted',
            'font-semibold',
            'truncate',
            { 'text-xs': !!props.chapterTitle },
          ]"
          v-text="props.bookName"
        />
        <div
          v-if="props.chapterTitle"
          class="text-muted text-sm font-semibold truncate"
          v-text="props.chapterTitle"
        />
      </div>

      <UBadge
        v-if="props.isPreview"
        class="shrink-0"
        color="primary"
        variant="subtle"
        :label="$t('reader_preview_badge')"
      />
    </div>

    <slot name="center" />

    <div class="shrink-0 flex items-center">
      <slot name="trailing" />
    </div>
  </header>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps({
  bookName: {
    type: String,
    default: '',
  },
  chapterTitle: {
    type: String,
    default: '',
  },
  isPreview: {
    type: Boolean,
    default: false,
  },
  // Defaults to the shelf; preview readers pass the product page.
  backTo: {
    type: Object as PropType<RouteLocationRaw>,
    default: undefined,
  },
})

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

const backRoute = computed(() => props.backTo ?? localeRoute({ name: 'shelf' }))
</script>
