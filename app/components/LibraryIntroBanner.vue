<template>
  <section
    v-if="isVisible"
    class="relative w-full mb-4 py-3 pl-4 pr-10 rounded-xl border border-default bg-linear-to-r from-theme-cyan/25 to-theme-cyan/10"
  >
    <!-- Mobile wraps to 2 rows (title + CTA, then full-width description); desktop is one row in source order. -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 phone:flex-nowrap">
      <h2
        class="order-1 shrink-0 font-bold text-highlighted"
        v-text="$t('library_intro_banner_title')"
      />
      <p
        class="order-3 w-full min-w-0 text-sm text-muted truncate phone:order-2 phone:flex-1"
        v-text="$t('library_intro_banner_description')"
      />
      <UButton
        class="order-2 ml-auto shrink-0 phone:order-3 phone:ml-0"
        :to="ctaRoute"
        :label="ctaLabel"
        color="primary"
        size="xs"
        trailing-icon="i-material-symbols-arrow-forward-rounded"
        @click="handleCtaClick"
      />
    </div>
    <UButton
      class="absolute top-2 right-2"
      icon="i-material-symbols-close-rounded"
      color="neutral"
      variant="ghost"
      size="xs"
      :aria-label="$t('library_intro_banner_dismiss')"
      @click="handleDismiss"
    />
  </section>
</template>

<script setup lang="ts">
import { useMounted } from '@vueuse/core'

const { t } = useI18n()
const localeRoute = useLocaleRoute()
const { isPlusOrDevicePlus } = useDevicePlusEntitlement()

const { isDismissed, dismissLibraryIntroBanner } = useLibraryIntroBanner()
// Gate behind mount so the SSR'd grid doesn't hydrate-mismatch on persisted state.
const isMounted = useMounted()
const isVisible = computed(() => isMounted.value && !isDismissed.value)

// Plus members already subscribe, so point them to the explainer; others to the paywall.
const ctaRoute = computed(() => (isPlusOrDevicePlus.value
  ? localeRoute({ name: 'about', hash: '#library', query: { ll_source: 'library-intro' } })
  : localeRoute({ name: 'member', query: { ll_source: 'library-intro' } })))

const ctaLabel = computed(() => (isPlusOrDevicePlus.value
  ? t('library_intro_banner_cta_about')
  : t('library_intro_banner_cta_member')))

function handleDismiss() {
  dismissLibraryIntroBanner()
  useLogEvent('library_intro_dismiss')
}

function handleCtaClick() {
  useLogEvent('library_intro_cta_click', { is_plus: isPlusOrDevicePlus.value })
}
</script>
