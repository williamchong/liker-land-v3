<template>
  <UModal
    v-model:open="open"
    :title="$t('civic_voices_modal_title')"
    :description="$t('civic_voices_modal_description')"
    :ui="{
      content: 'sm:max-w-md',
      body: 'flex flex-col gap-8',
      footer: 'justify-center',
    }"
  >
    <template #body>
      <div
        v-if="isLoading"
        class="flex justify-center py-8"
      >
        <UIcon
          name="i-material-symbols-progress-activity"
          class="size-6 text-muted animate-spin"
        />
      </div>

      <template v-else>
        <section
          v-for="group in voiceGroups"
          :key="group.likerId"
          class="flex flex-col gap-3"
        >
          <div class="flex flex-col gap-1.5">
            <div
              v-for="voice in group.voices"
              :key="voice.id"
              class="flex items-center gap-2"
            >
              <UAvatar
                :src="voice.avatarUrl"
                :alt="voice.name"
                icon="i-material-symbols-record-voice-over-outline-rounded"
                size="2xs"
              />
              <span
                class="text-sm font-bold text-highlighted"
                v-text="voice.name"
              />
            </div>
          </div>

          <ul
            v-if="group.bookClassIds.length"
            class="grid grid-cols-2 gap-x-4 gap-y-3"
          >
            <li
              v-for="classId in group.bookClassIds"
              :key="classId"
            >
              <AffiliateBookListItem
                :nft-class-id="classId"
                @navigate="open = false"
              />
            </li>
          </ul>

          <UButton
            v-if="group.hasMore"
            :to="getAffiliateStoreRoute(group.likerId)"
            :label="$t('civic_voices_modal_view_voice_books')"
            color="neutral"
            variant="link"
            trailing-icon="i-material-symbols-arrow-forward-rounded"
            :ui="{ base: 'px-0', label: 'border-b border-current pb-0.5' }"
            @click="open = false"
          />
        </section>

        <p
          v-if="!voiceGroups.length"
          class="py-4 text-sm text-muted text-center"
          v-text="$t('civic_voices_modal_empty')"
        />
      </template>
    </template>

    <template
      v-if="!isLoading && voiceGroups.length"
      #footer
    >
      <p
        class="flex items-start gap-1.5 text-xs text-muted text-center text-balance"
      >
        <UIcon
          name="i-material-symbols-info-outline-rounded"
          class="shrink-0 mt-0.5"
        />
        <span v-text="$t('civic_voices_modal_access_note')" />
      </p>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PlusAffiliateSourcesResponse } from '~~/shared/types/affiliate'
import { CIVIC_VOICES_PREVIEW_BOOK_LIMIT } from '~~/shared/constants/affiliate'

const open = defineModel<boolean>('open', { default: false })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

const sources = ref<PlusAffiliateSourcesResponse['sources']>([])
const isLoading = ref(false)
const hasLoaded = ref(false)

const voiceGroups = computed(() => sources.value
  .filter(source => source.customVoices.length)
  .map(source => ({
    likerId: source.likerId,
    voices: source.customVoices,
    bookClassIds: source.affiliateClassIds.slice(0, CIVIC_VOICES_PREVIEW_BOOK_LIMIT),
    hasMore: source.affiliateClassIds.length > CIVIC_VOICES_PREVIEW_BOOK_LIMIT
      || source.affiliatePublisherWallets.length > 0,
  })))

function getAffiliateStoreRoute(likerId: string) {
  return localeRoute({ name: 'store', query: { affiliate: likerId } })
}

async function loadData() {
  if (hasLoaded.value || isLoading.value) return
  isLoading.value = true
  try {
    const result = await apiFetch<PlusAffiliateSourcesResponse>('/plus/voices')
    sources.value = result?.sources ?? []
    hasLoaded.value = true
  }
  catch (error) {
    console.error('[PlusVoicesModal] Failed to load:', error)
  }
  finally {
    isLoading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) loadData()
})
</script>
