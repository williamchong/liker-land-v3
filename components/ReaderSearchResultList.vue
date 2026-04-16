<template>
  <p
    v-if="isSearching"
    class="text-sm text-muted text-center py-6"
    v-text="$t('reader_search_loading')"
  />
  <p
    v-else-if="hasSearched && results.length === 0"
    class="text-sm text-muted text-center py-6"
    v-text="$t('reader_search_no_results')"
  />
  <ul
    v-else-if="segmentedResults.length > 0"
    class="divide-y divide-gray-500"
  >
    <li
      v-for="result in segmentedResults"
      :key="result.id"
    >
      <button
        type="button"
        class="w-full text-left px-4 py-3 hover:bg-elevated transition-colors"
        @click="handleClick(result)"
      >
        <p
          v-if="result.chapterTitle"
          class="text-xs text-muted mb-1 truncate"
          v-text="result.chapterTitle"
        />
        <p class="text-sm line-clamp-2">
          <template
            v-for="(segment, segmentIndex) in result.segments"
            :key="segmentIndex"
          >
            <mark
              v-if="segment.isMatch"
              class="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-0.5"
              v-text="segment.text"
            />
            <span
              v-else
              v-text="segment.text"
            />
          </template>
        </p>
        <p
          v-if="result.pageLabel"
          class="text-xs text-muted mt-1"
          v-text="result.pageLabel"
        />
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
interface ExcerptSegment {
  text: string
  isMatch: boolean
}

const props = defineProps<{
  isSearching: boolean
  hasSearched: boolean
  results: ReaderSearchResult[]
  query: string
}>()

const emit = defineEmits<{
  select: [result: ReaderSearchResult]
}>()

const { t: $t } = useI18n()

function splitExcerpt(excerpt: string, trimmedQuery: string): ExcerptSegment[] {
  if (!trimmedQuery) return [{ text: excerpt, isMatch: false }]

  const segments: ExcerptSegment[] = []
  const haystack = excerpt.toLowerCase()
  const needle = trimmedQuery.toLowerCase()
  let cursor = 0
  while (cursor < excerpt.length) {
    const found = haystack.indexOf(needle, cursor)
    if (found === -1) {
      segments.push({ text: excerpt.slice(cursor), isMatch: false })
      break
    }
    if (found > cursor) {
      segments.push({ text: excerpt.slice(cursor, found), isMatch: false })
    }
    segments.push({ text: excerpt.slice(found, found + trimmedQuery.length), isMatch: true })
    cursor = found + trimmedQuery.length
  }
  return segments
}

const segmentedResults = computed(() => {
  const trimmedQuery = props.query.trim()
  return props.results.map(result => ({
    ...result,
    segments: splitExcerpt(result.excerpt, trimmedQuery),
  }))
})

function handleClick(result: ReaderSearchResult) {
  emit('select', result)
}
</script>
