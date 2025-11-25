<template>
  <div class="flex flex-col items-start gap-5">
    <div
      :class="[
        isDarkBackground ? 'text-theme-cyan' : 'text-theme-black',
        'text-left',
        'font-bold',
        'border-b-2 border-current',
      ]"
      v-text="$t('pricing_page_subscription')"
    />

    <ul
      :class="[
        'whitespace-pre-wrap',
        'space-y-4 text-left',
        '*:flex *:items-start',
        '[&>li>span:first-child]:shrink-0',
        '[&>li>span:first-child]:mt-1',
        '[&>li>span:first-child]:mr-2',
        '[&>li>span:first-child]:text-theme-cyan',
        { '[&>li>span:last-child]:text-white': isDarkBackground },
      ]"
    >
      <li>
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
          <span v-text="$t('pricing_page_feature_4')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span
            v-text="$t('pricing_page_feature_5', {
              monthlyPrice,
              yearlyPrice,
            })"
          />
        </li>
      </template>
      <li>
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_6')" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  isDarkBackground?: boolean
  isCompact?: boolean
}>(), {
  isDarkBackground: false,
  isCompact: false,
})

const {
  monthlyPrice,
  yearlyPrice,
} = useSubscriptionPricing()
</script>
