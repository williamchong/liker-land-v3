<template>
  <UAlert
    :title="$t('product_page_plus_promo_title')"
    :description="$t('product_page_plus_promo_description')"
    icon="i-material-symbols-celebration-outline-rounded"
    color="primary"
    variant="subtle"
    orientation="horizontal"
    :ui="{
      root: 'rounded-lg items-center gap-3 py-2 px-3',
      wrapper: 'gap-0.5',
      title: 'text-sm font-bold',
      description: 'text-xs',
      icon: 'size-5',
    }"
  />
</template>
