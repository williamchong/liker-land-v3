<template>
  <div
    v-if="carouselItems.length > 1"
    :class="['relative', props.class]"
  >
    <UCarousel
      v-slot="{ item }"
      :items="carouselItems"
      dots
      loop
      fade
      auto-height
      :autoplay="{ delay: 5000, stopOnInteraction: true }"
      :ui="{
        item: 'basis-full aspect-2/3 cursor-pointer',
        dots: 'mt-2 mb-6 gap-2',
        dot: 'size-2 bg-gray-300 data-[active]:bg-gray-500',
      }"
    >
      <div
        class="relative flex items-center justify-center w-full h-full"
        @click="openModal(item)"
      >
        <BookCover
          v-if="item.type === 'cover'"
          class="w-full h-full"
          :src="item.src"
          :alt="props.alt"
          :is-vertical-center="true"
        />

        <img
          v-else-if="item.type === 'image'"
          :src="item.src"
          :alt="props.alt"
          :class="[
            'max-w-full',
            'max-h-full',
            'object-contain',
            'rounded-lg',
            { 'shadow-[0_2px_4px_0_rgba(0,0,0,0.10)]': props.hasShadow },
          ]"
        >

        <div
          v-else-if="item.type === 'youtube' && item.videoId"
          class="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden"
        >
          <img
            :src="getYouTubeThumbnailUrl(item.videoId)"
            :alt="props.alt"
            class="w-full h-full object-cover"
          >
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <UIcon
                name="i-material-symbols-play-arrow-rounded"
                class="w-8 h-8 text-white ml-1"
              />
            </div>
          </div>
        </div>

        <div
          v-else-if="item.type === 'video'"
          class="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden"
        >
          <video
            :src="item.src"
            :poster="props.coverSrc"
            class="w-full h-full object-contain"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center">
              <UIcon
                name="i-material-symbols-play-arrow-rounded"
                class="w-8 h-8 text-white ml-1"
              />
            </div>
          </div>
        </div>
      </div>
    </UCarousel>

    <UModal
      v-model:open="isModalOpen"
      :ui="{
        content: 'max-w-4xl bg-black',
      }"
      :close="{ color: 'neutral', variant: 'ghost', class: 'text-white' }"
    >
      <template #content>
        <img
          v-if="modalItem?.type === 'cover' || modalItem?.type === 'image'"
          :src="modalItem?.fullSrc || modalItem?.src"
          :alt="props.alt"
          class="w-full h-auto max-h-[80vh] object-contain"
        >

        <div
          v-else-if="modalItem?.type === 'youtube' && modalItem?.videoId"
          class="aspect-video"
        >
          <ScriptYouTubePlayer
            :video-id="modalItem.videoId"
            class="w-full h-full"
          />
        </div>

        <video
          v-else-if="modalItem?.type === 'video'"
          :src="modalItem?.src"
          controls
          autoplay
          playsinline
          class="w-full max-h-[80vh]"
        />
      </template>
    </UModal>
  </div>

  <BookCover
    v-else
    :class="props.class"
    :src="props.coverSrc"
    :alt="props.alt"
    :is-vertical-center="true"
    :has-shadow="props.hasShadow"
  />
</template>

<script setup lang="ts">
const IMAGE_THUMBNAIL_SIZE = 600
const IMAGE_FULL_SIZE = 1200

interface CarouselItem {
  type: 'cover' | 'image' | 'youtube' | 'video'
  src?: string
  fullSrc?: string
  videoId?: string
}

const { getResizedImageURL } = useImageResize()

const props = defineProps({
  coverSrc: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: '',
  },
  promotionalImages: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  promotionalVideos: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  hasShadow: {
    type: Boolean,
    default: false,
  },
  class: {
    type: [String, Array, Object],
    default: undefined,
  },
})

const isModalOpen = ref(false)
const modalItem = ref<CarouselItem | null>(null)

function openModal(item: CarouselItem) {
  modalItem.value = item
  isModalOpen.value = true
}

const carouselItems = computed<CarouselItem[]>(() => {
  const items: CarouselItem[] = []

  if (props.coverSrc) {
    items.push({
      type: 'cover',
      src: props.coverSrc,
    })
  }

  for (const imageUrl of props.promotionalImages) {
    if (imageUrl) {
      items.push({
        type: 'image',
        src: getResizedImageURL(imageUrl, { size: IMAGE_THUMBNAIL_SIZE }),
        fullSrc: getResizedImageURL(imageUrl, { size: IMAGE_FULL_SIZE }),
      })
    }
  }

  for (const videoUrl of props.promotionalVideos) {
    if (!videoUrl) continue

    if (isYouTubeUrl(videoUrl)) {
      const videoId = extractYouTubeVideoId(videoUrl)
      if (videoId) {
        items.push({
          type: 'youtube',
          videoId,
        })
      }
    }
    else {
      items.push({
        type: 'video',
        src: videoUrl,
      })
    }
  }

  return items
})
</script>
