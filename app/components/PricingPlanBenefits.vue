<template>
  <div
    :class="[
      'flex',
      'flex-col',
      isTitleCenter ? 'items-center' : 'items-start',
      'gap-3 laptop:gap-4',
    ]"
  >
    <div
      v-if="isCivicToggleVisible"
      class="flex w-full p-0.5 bg-theme-black/8 dark:bg-theme-white/8 rounded-full"
    >
      <button
        v-for="option in tierOptions"
        :key="option.value"
        type="button"
        :class="[
          'flex-1 px-5 py-1.5',
          'text-sm font-bold text-center',
          'rounded-full',
          'transition-all duration-200',
          'cursor-pointer',
          selectedTier === option.value
            ? 'bg-theme-white dark:bg-theme-black text-theme-black dark:text-theme-cyan shadow-sm'
            : 'text-theme-black/40 dark:text-theme-white/40',
        ]"
        @click="selectedTier = option.value"
      >
        <span class="inline-flex items-center justify-center gap-1">
          <UIcon
            v-if="option.isCurrent"
            name="i-material-symbols-check-circle-rounded"
            class="shrink-0 size-3.5"
          />
          <span v-text="option.label" />
        </span>
      </button>
    </div>
    <div
      v-else-if="!isTitleHidden"
      :class="[
        isDarkBackground ? 'text-theme-cyan' : 'text-theme-black dark:text-theme-cyan',
        isTitleCenter ? 'text-center' : 'text-left',
        'font-bold',
        'border-b-2 border-current',
      ]"
      v-text="title || $t('pricing_page_subscription')"
    />

    <ul :class="featureListClass">
      <li
        v-for="(feature, index) in prependedFeatures"
        :key="`prepended-${index}`"
      >
        <UIcon name="i-material-symbols-check" />
        <span v-text="feature" />
      </li>
      <li>
        <UIcon name="i-material-symbols-check" />
        <i18n-t
          keypath="pricing_page_feature_library"
          tag="span"
        >
          <template #library>
            <NuxtLink
              :to="localeRoute({ name: 'library' })"
              class="underline"
              @click="handleClickLibrary"
            >
              {{ $t('pricing_page_feature_library_link') }}
            </NuxtLink>
          </template>
        </i18n-t>
      </li>
      <li v-if="!isAudioHidden">
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_1')" />
      </li>
      <li>
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_2')" />
      </li>
      <template v-if="!isCompact">
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_3')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <i18n-t
            keypath="pricing_page_feature_4"
            tag="span"
          >
            <template #customerService>
              <button
                type="button"
                class="underline cursor-pointer"
                @click="handleOpenIntercom"
                v-text="$t('pricing_page_feature_4_customer_service')"
              />
            </template>
          </i18n-t>
        </li>
      </template>
    </ul>

    <button
      v-if="isCivicToggleVisible && selectedTier === 'plus'"
      type="button"
      :class="[dividerClass, 'group cursor-pointer']"
      @click="handleUpgradeToCivic"
    >
      <span class="h-px flex-1 bg-current" />
      <span class="flex items-center gap-1 font-semibold transition-colors group-hover:text-theme-black dark:group-hover:text-theme-cyan">
        <span v-text="$t('pricing_page_civic_upgrade_cta')" />
        <UIcon
          name="i-material-symbols-arrow-forward-rounded"
          class="shrink-0"
        />
      </span>
      <span class="h-px flex-1 bg-current" />
    </button>

    <template v-if="selectedTier === 'civic'">
      <div :class="dividerClass">
        <span class="h-px flex-1 bg-current" />
        <span
          class="font-semibold"
          v-text="$t('pricing_page_civic_extra_divider')"
        />
        <span class="h-px flex-1 bg-current" />
      </div>

      <ul :class="featureListClass">
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_civic_benefit_gift')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <i18n-t
            keypath="pricing_page_civic_benefit_voices"
            tag="span"
          >
            <template #voiceArtist>
              <button
                type="button"
                class="underline cursor-pointer"
                @click="handleShowVoices"
                v-text="$t('pricing_page_civic_benefit_voices_artist')"
              />
            </template>
          </i18n-t>
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_civic_benefit_request')" />
        </li>
      </ul>
    </template>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
  title?: string
  isTitleCenter?: boolean
  isTitleHidden?: boolean
  isDarkBackground?: boolean
  isCompact?: boolean
  isAudioHidden?: boolean
  prependedFeatures?: string[]
  // Shows a Plus/Civic toggle in place of the title and, on Civic, appends the
  // Civic-only benefits below the shared Plus list.
  isCivicToggleVisible?: boolean
  // The viewer's active tier, marked as "current plan" in the toggle.
  currentTier?: LikerPlusTier
}>(), {
  isTitleCenter: false,
  isTitleHidden: false,
  isDarkBackground: false,
  isCompact: false,
  isAudioHidden: false,
  prependedFeatures: () => [],
  isCivicToggleVisible: false,
  currentTier: undefined,
})

const emit = defineEmits<{ showVoices: [] }>()

const selectedTier = defineModel<LikerPlusTier>('tier', { default: 'plus' })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const intercom = useIntercom()

const tierOptions = computed<{ value: LikerPlusTier, label: string, isCurrent: boolean }[]>(() => [
  { value: 'plus', label: $t('pricing_page_tier_plus'), isCurrent: props.currentTier === 'plus' },
  { value: 'civic', label: $t('pricing_page_tier_civic'), isCurrent: props.currentTier === 'civic' },
])

const featureListClass = computed(() => [
  '*:flex *:items-start',
  'space-y-3 laptop:space-y-4',
  'text-left',
  'whitespace-pre-wrap',
  '[&>li>span:first-child]:shrink-0',
  '[&>li>span:first-child]:mt-1',
  '[&>li>span:first-child]:mr-2',
  '[&>li>span:first-child]:text-theme-cyan',
  { '[&>li>span:last-child]:text-white': props.isDarkBackground },
])

// Shared chrome for the two mutually-exclusive tier dividers (Plus upgrade CTA
// and Civic section header).
const dividerClass = 'flex items-center gap-3 w-full text-xs text-theme-black/40 dark:text-theme-white/40'

function handleClickLibrary() {
  useLogEvent('pricing_benefit_click_library')
}

function handleOpenIntercom() {
  useLogEvent('pricing_benefit_click_intercom')
  intercom.showNewMessage($t('pricing_page_intercom_prefill'))
}

function handleShowVoices() {
  useLogEvent('pricing_benefit_click_civic_voices')
  emit('showVoices')
}

function handleUpgradeToCivic() {
  useLogEvent('pricing_page_civic_upgrade_cta_click')
  selectedTier.value = 'civic'
}
</script>
