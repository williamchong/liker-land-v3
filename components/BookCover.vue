<template>
  <div
    :class="[
      { relative: isShowPlaceholder },
      'flex',
      { 'aspect-2/3': !isVerticalCenter || isShowPlaceholder },
      isVerticalCenter ? 'items-center' : 'items-end',
    ]"
  >
    <component
      :is="props.to ? NuxtLink : 'div'"
      :class="{
        'relative': hasShadow && hasLoaded,
        'w-full h-full': hasError,
      }"
      :to="props.to"
      @click="emit('click', $event)"
    >
      <div
        v-if="hasShadow"
        :class="[
          'absolute',
          'inset-0',
          'bg-[#D3D3D3]',
          borderRadiusClass,
          'opacity-20',
          'brightness-50',
          'blur-xl',
          'scale-110',
          'origin-[top_center]',
          '-translate-x-[10px]',
          'pointer-events-none',
        ]"
        :style="{ backgroundImage: hasLoaded && !hasError ? `url(${props.src})` : '' }"
      />
      <img
        ref="imgElement"
        :class="[
          { relative: hasShadow },
          'bg-white',
          coverClass,
          !isShowPlaceholder ? 'opacity-100' : 'opacity-0',
          { 'blur-xl': !hasLoaded },
          'transition-all',
          'duration-300',
          'ease-out',
        ]"
        :src="props.src"
        :alt="props.alt"
        @load="handleImageLoad"
        @error="handleImageError"
      >
    </component>
    <div
      v-if="isShowPlaceholder"
      :class="[
        'absolute',
        'flex',
        'justify-center',
        'items-center',
        'inset-0',
        'bg-[#E2E2E2]/60',
        'pointer-events-none',
        coverClass,
        { 'animate-pulse': !hasLoaded },
      ]"
    >
      <UIcon
        v-if="hasError"
        class="text-[#9B9B9B]/50"
        name="i-material-symbols-book-2-outline-rounded"
        size="100"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import { NuxtLink } from '#components'

const props = defineProps({
  src: {
    type: String,
    default: undefined,
  },
  alt: {
    type: String,
    default: '',
  },
  to: {
    type: Object as PropType<RouteLocationRaw>,
    default: undefined,
  },
  isVerticalCenter: {
    type: Boolean,
    default: false,
  },
  hasShadow: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['click'])

const hasLoaded = ref(false)
const hasError = ref(false)

const imgElement = useTemplateRef<HTMLImageElement>('imgElement')

const borderRadiusClass = 'rounded-lg'

const coverClass = computed(() => {
  const classes = [
    'border',
    'border-[#EBEBEB]',
    borderRadiusClass,
    { 'shadow-[0_2px_4px_0_rgba(0,0,0,0.10)]': props.hasShadow },
  ]
  if (hasLoaded.value) {
    const instance = getCurrentInstance()
    if (props.to || (instance?.vnode.props?.onClick)) {
      classes.push(
        'cursor-pointer',
        'hover:shadow-xl',
        'hover:scale-105',
        'transition-all',
        'duration-200',
        'ease-in-out',
        'origin-bottom',
      )
    }
  }
  else {
    classes.push('pointer-events-none')
  }
  return classes
})

const isShowPlaceholder = computed(() => !props.src || !hasLoaded.value || hasError.value)

onMounted(() => {
  if (imgElement.value?.complete) {
    hasLoaded.value = true
  }
})

watch(
  () => props.src,
  (newSrc) => {
    if (newSrc) {
      hasLoaded.value = false
      hasError.value = false
    }
  },
)

function handleImageLoad() {
  hasLoaded.value = true
}

function handleImageError() {
  hasLoaded.value = true
  hasError.value = true
}
</script>
