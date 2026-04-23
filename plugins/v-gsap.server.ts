/* eslint-disable @typescript-eslint/no-explicit-any -- Port of v-gsap-nuxt's untyped SSR props helper; preset/modifier shapes are user-provided */
import type { DirectiveBinding } from 'vue'

const entrancePresets = [
  { name: 'slide-left', modifiers: 'whenVisible.fromInvisible.once.fromTo' },
  { name: 'slide-right', modifiers: 'whenVisible.fromInvisible.once.fromTo' },
  { name: 'slide-top', modifiers: 'whenVisible.fromInvisible.once.fromTo' },
  { name: 'slide-bottom', modifiers: 'whenVisible.fromInvisible.once.fromTo' },
  { name: 'scale', modifiers: 'whenVisible.fromInvisible.once.fromTo' },
  { name: 'scale-full', modifiers: 'whenVisible.fromInvisible.once.fromTo' },
  { name: 'fade', modifiers: 'whenVisible.fromInvisible.once.fromTo' },
]

function resolveModifiers(binding: DirectiveBinding<any>, configOptions: any) {
  const modifiers: Record<string, boolean | undefined> = { ...binding.modifiers }
  const apply = (modString: string) => {
    modString.split('.').forEach((m) => {
      modifiers[m] = true
    })
  }
  if (modifiers.preset && !!configOptions?.presets?.length) {
    const preset = configOptions.presets.find((p: any) => p.name === binding.value)
    if (preset) apply(preset.modifiers)
  }
  if (modifiers.entrance) {
    const preset = entrancePresets.find(p => modifiers[p.name])
    if (preset) apply(preset.modifiers)
  }
  return modifiers
}

export default defineNuxtPlugin((nuxtApp) => {
  const configOptions: any = (useRuntimeConfig().public as any).vgsap ?? {}

  nuxtApp.vueApp.directive('gsap', {
    getSSRProps: (binding) => {
      const modifiers = resolveModifiers(binding as DirectiveBinding<any>, configOptions)
      return {
        'data-vgsap-from-invisible': modifiers.fromInvisible,
        'data-vgsap-stagger': modifiers.stagger,
      }
    },
  })
})
