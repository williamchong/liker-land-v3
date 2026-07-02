<template>
  <UAlert
    :description="$t('store_intro_banner_description')"
    :actions="actions"
    :close="{
      variant: 'solid',
      color: 'neutral',
      ui: { base: 'relative rounded-full' },
    }"
    color="neutral"
    variant="subtle"
    :style="{ '--backdrop-image': `url(${backdropImageSrc})` }"
    :ui="{
      root: 'store-intro-banner rounded-xl bg-cover tablet:bg-size-[60%] bg-no-repeat bg-right light:ring-0',
      wrapper: 'pr-16',
      title: 'flex items-center gap-1.5 font-bold text-theme-cyan text-lg',
      description: 'text-theme-white',
    }"
    @update:open="handleDismiss"
  >
    <template #title>
      <i18n-t keypath="store_intro_banner_title">
        <template #siteName>
          <AppLogo
            class="inline h-[0.9em] align-middle"
            :is-icon="false"
            :is-padded="false"
            aria-label="3ook.com"
          />
        </template>
      </i18n-t>
    </template>
    <template #leading>
      <img
        :class="[
          'absolute',
          'phone:right-0',
          'max-phone:left-full',
          'top-1/2',
          'max-phone:-translate-x-1',
          'phone:-translate-y-3',
          'w-12',
          'mr-13',
          'scale-300', 'phone:scale-400',
          'origin-right',
        ]"
        :src="mockupImageSrc"
        alt=""
        aria-hidden="true"
      >
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import mockupImageSrc from '~/assets/images/mockup.png'
import backdropImageSrc from '~/assets/images/plus-welcome-banner-backdrop.webp'

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

// Visibility (mount + persisted dismiss) is owned by the parent's v-if, so this
// component just renders and logs its own view.
const { dismissStoreIntroBanner } = useStoreIntroBanner()

const actions = computed(() => [{
  label: $t('store_intro_banner_cta'),
  to: localeRoute({ name: 'about', query: { ll_source: 'store-intro' } }),
  color: 'neutral' as const,
  variant: 'outline' as const,
  trailingIcon: 'i-material-symbols-arrow-forward-rounded',
  ui: {
    label: 'light:text-inverted',
    trailingIcon: 'light:text-inverted',
  },
  onClick: handleCTAClick,
}])

onMounted(() => {
  useLogEvent('store_intro_view')
})

function handleDismiss() {
  dismissStoreIntroBanner()
  useLogEvent('store_intro_dismiss')
}

function handleCTAClick() {
  useLogEvent('store_intro_cta_click')
}
</script>

<style scoped>
/* Dark tint, opaque on the left for legible text, fading full-width into the
   backdrop. The 70% tint floor keeps the right from going fully transparent so
   the left↔right contrast stays gentle. */
.store-intro-banner {
  --banner-tint: var(--color-theme-black);
  background-color: var(--banner-tint);
  background-image:
    linear-gradient(
      to right,
      var(--banner-tint),
      color-mix(in oklab, var(--banner-tint) 70%, transparent)
    ),
    var(--backdrop-image);
}
</style>
