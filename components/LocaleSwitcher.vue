<template>
  <USelect
    :model-value="locale"
    :items="localesItems"
    class="w-32"
    :icon="props.isIconHidden ? undefined : 'i-material-symbols-language'"
    trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
    size="md"
    @update:model-value="handleLocaleChange"
  />
</template>

<script setup lang="ts">
const props = defineProps({
  isIconHidden: Boolean,
})

const { locale, locales, setLocale } = useAutoLocale()

const localesItems = computed(() => locales.value.map(l => ({ label: l.name, value: l.code })))

function handleLocaleChange(value: string) {
  setLocale(value as 'en' | 'zh-Hant')
}
</script>
