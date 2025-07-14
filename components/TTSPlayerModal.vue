<template>
  <UModal
    :fullscreen="true"
    :ui="{ content: 'bg-white divide-none' }"
    @close="handleModalClose"
  >
    <template #content>
      <div class="flex flex-col h-full w-full max-w-[670px] mx-auto py-6 px-8 laptop:px-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="grow overflow-hidden">
            <h1
              class="text-center text-sm font-semibold text-gray-500 truncate"
              v-text="bookTitle"
            />
          </div>

          <UButton
            class="shrink-0"
            icon="i-material-symbols-close-rounded"
            size="md"
            variant="ghost"
            @click="handleModalClose"
          />
        </div>
        <h2
          v-if="sectionTitle"
          class="text-lg font-semibold text-gray-700 truncate text-center laptop:my-4"
          v-text="sectionTitle"
        />

        <!-- Book Cover -->
        <div class="flex justify-center mt-4 laptop:mt-8 laptop:mb-10 z-20">
          <BookCover
            class="w-[150px] tablet:w-[120px] laptop:w-[220px] shrink-0"
            :src="bookCoverSrc"
            :alt="bookTitle"
            :is-vertical-center="true"
            :has-shadow="true"
          />
        </div>

        <!-- Content -->
        <div class="relative flex-1 min-h-0">
          <div
            ref="scrollContainer"
            class="overflow-y-auto hide-scrollbar h-full relative"
            style="scroll-behavior: smooth;"
          >
            <ul class="flex flex-col gap-4 items-start py-6">
              <li
                v-for="item in visibleSegments"
                :key="item.id"
                ref="visibleSegmentElements"
                v-memo="[currentTTSSegmentIndex === item.index]"
                :class="getSegmentClass(item.index)"
              >
                {{ item.text }}
              </li>
            </ul>
          </div>
          <div class="pointer-events-none absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-white to-transparent" />
          <div class="pointer-events-none absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent" />
        </div>

        <!-- Controls -->
        <div class="px-4 py-2 pb-safe">
          <div class="flex items-center justify-center gap-6">
            <UButton
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-ic-round-skip-previous"
              variant="ghost"
              color="neutral"
              :disabled="!isTextToSpeechOn"
              @click="skipBackward"
            />
            <UButton
              v-if="isTextToSpeechPlaying"
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-line-md-pause"
              variant="ghost"
              color="neutral"
              @click="pauseTextToSpeech"
            />
            <UButton
              v-else
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-material-symbols-play-arrow-rounded"
              variant="ghost"
              color="neutral"
              @click="startTextToSpeech"
            />
            <UButton
              :ui="{ leadingIcon: 'size-10' }"
              icon="i-ic-round-skip-next"
              variant="ghost"
              color="neutral"
              :disabled="!isTextToSpeechOn"
              @click="skipForward"
            />
          </div>

          <!-- Player Options -->
          <div class="mt-4 flex justify-center items-center gap-4">
            <USelect
              v-model="ttsLanguageVoice"
              :items="ttsLanguageVoiceOptions"
            />
            <USelect
              v-model="ttsPlaybackRate"
              icon="i-material-symbols-speed-rounded"
              :items="ttsPlaybackRateOptions"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TTSPlayerModalProps } from './TTSPlayerModal.props'

const emit = defineEmits<{
  open: []
  close: []
}>()

const props = withDefaults(
  defineProps<TTSPlayerModalProps>(),
  {
    bookTitle: '',
    bookCoverSrc: '',
    bookAuthorName: '',
    sectionTitle: '',
    nftClassId: '',
    segments: () => [],
  },
)

const BUFFER_SIZE = 10
const visibleSegmentElements = ref<HTMLElement[]>([])
const scrollContainer = ref<HTMLElement>()

const {
  ttsLanguageVoiceOptions,
  ttsLanguageVoice,
  ttsPlaybackRateOptions,
  ttsPlaybackRate,
  isTextToSpeechOn,
  isTextToSpeechPlaying,
  pauseTextToSpeech,
  startTextToSpeech,
  setTTSSegments,
  skipForward,
  skipBackward,
  stopTextToSpeech,
  currentTTSSegmentIndex,
} = useTextToSpeech({
  nftClassId: props.nftClassId,
  bookName: props.bookTitle,
  bookAuthorName: props.bookAuthorName,
  bookCoverSrc: props.bookCoverSrc,
  onError: (error: Event) => {
    console.error('TTS Error:', error)
  },
})

const visibleSegments = computed(() => {
  const start = Math.max(currentTTSSegmentIndex.value - BUFFER_SIZE, 0)
  const end = Math.min(currentTTSSegmentIndex.value + BUFFER_SIZE, props.segments.length)
  return props.segments.slice(start, end)
})

const visibleTTSSegmentsStartIndex = computed(() =>
  Math.max(currentTTSSegmentIndex.value - BUFFER_SIZE, 0),
)

const visibleTTSSegmentElementIndex = computed(() =>
  currentTTSSegmentIndex.value - visibleTTSSegmentsStartIndex.value,
)

watch(currentTTSSegmentIndex, async () => {
  await nextTick()
  const targetElement = visibleSegmentElements.value[visibleTTSSegmentElementIndex.value]
  targetElement?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
})

onMounted(() => {
  setTTSSegments(props.segments)
})

function getSegmentClass(index: number) {
  const baseClasses = 'inline-block text-sm laptop:text-lg transition-opacity duration-300'
  const activeClasses = 'text-gray-700 opacity-100 font-bold'
  const inactiveClasses = 'opacity-40 text-gray-500'

  return `${baseClasses} ${index === currentTTSSegmentIndex.value ? activeClasses : inactiveClasses}`
}

function handleModalClose() {
  stopTextToSpeech()
  emit('close')
}
</script>
