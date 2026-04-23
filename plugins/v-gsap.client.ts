/* eslint-disable @typescript-eslint/no-explicit-any -- Port of v-gsap-nuxt's untyped runtime directive; binding.value / modifiers shape varies per modifier combination */
import type { DirectiveBinding, VNode } from 'vue'
import { nextTick } from 'vue'

type GsapBundle = {
  gsap: typeof import('gsap').gsap
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger
  Draggable: typeof import('gsap/Draggable').default
}

let gsapBundlePromise: Promise<GsapBundle> | null = null
let gsapBundle: GsapBundle | null = null

function loadGsap(): Promise<GsapBundle> {
  if (!gsapBundlePromise) {
    gsapBundlePromise = (async () => {
      const [
        { gsap },
        { ScrollTrigger },
        { ScrollToPlugin },
        { default: Draggable },
        { default: TextPlugin },
      ] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/ScrollToPlugin'),
        import('gsap/Draggable'),
        import('gsap/TextPlugin'),
      ])
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Draggable, TextPlugin)
      if (!didInstallResizeListener) {
        window.addEventListener('resize', () => ScrollTrigger.refresh(true))
        didInstallResizeListener = true
      }
      gsapBundle = { gsap, ScrollTrigger, Draggable }
      return gsapBundle
    })()
  }
  return gsapBundlePromise
}

let didInstallResizeListener = false

const entrancePresets = [
  { name: 'slide-left', modifiers: 'whenVisible.fromInvisible.once.fromTo', value: [{ x: -32 }, { x: 0 }] },
  { name: 'slide-right', modifiers: 'whenVisible.fromInvisible.once.fromTo', value: [{ x: 32 }, { x: 0 }] },
  { name: 'slide-top', modifiers: 'whenVisible.fromInvisible.once.fromTo', value: [{ y: -32 }, { y: 0 }] },
  { name: 'slide-bottom', modifiers: 'whenVisible.fromInvisible.once.fromTo', value: [{ y: 32 }, { y: 0 }] },
  { name: 'scale', modifiers: 'whenVisible.fromInvisible.once.fromTo', value: [{ scale: 0.75 }, { scale: 1 }] },
  { name: 'scale-full', modifiers: 'whenVisible.fromInvisible.once.fromTo', value: [{ scale: 0 }, { scale: 1 }] },
  { name: 'fade', modifiers: 'whenVisible.fromInvisible.once.fromTo', value: [{ autoAlpha: 0 }, { autoAlpha: 1 }] },
]

type AnyBinding = DirectiveBinding<any>

function applyPreset(preset: { modifiers: string, value?: any }, binding: AnyBinding) {
  preset.modifiers.split('.').forEach((m) => {
    binding.modifiers[m] = true
  })
  if (typeof binding.value === 'string') binding.value = {}
  if (preset.value) {
    if (binding.modifiers.fromTo) {
      binding.value = [preset.value[0], { ...preset.value[1], ...binding.value }]
    }
    else {
      binding.value = { ...preset.value, ...binding.value }
    }
  }
}

function loadPreset(binding: AnyBinding, configOptions: any) {
  if (binding.modifiers.preset && !!configOptions?.presets?.length) {
    const preset = configOptions.presets.find((p: any) => p.name === binding.value)
    if (preset) applyPreset(preset, binding)
  }
  if (binding.modifiers.entrance) {
    const preset = entrancePresets.find(p => Object.keys(binding.modifiers).includes(p.name))
    if (preset) applyPreset(preset, binding)
  }
  return binding
}

function getValueFromModifier(binding: AnyBinding, term: string) {
  return Object.keys(binding.modifiers)
    .find(m => m.toLowerCase().includes(term.toLowerCase()))
    ?.split('-')?.[1]
}

function assignChildrenOrderAttributesFor(vnode: VNode | any, startOrder?: number): number {
  let order = startOrder || 0
  const getChildren = (n: any): any[] => {
    if (n?.children) return Array.from(n.children)
    if (n?.component?.subtree) return Array.from(n?.ctx?.subtree || [])
    return []
  }
  ;(getChildren(vnode) || []).forEach((child: any) => {
    ;(child?.dirs ? Array.from(child.dirs) as any[] : []).forEach((dir: any) => {
      if (dir.modifiers.timeline) return
      dir.modifiers[`suggestedOrder-${order}`] = true
      order++
    })
    order = assignChildrenOrderAttributesFor(child, order)
  })
  return order
}

const globalTimelines: Record<string, any> = {}
let gsapContext: any = null
let observer: MutationObserver | undefined
let intersectionObserver: IntersectionObserver | undefined

function prepareCallbacks(binding: AnyBinding) {
  const callbacks: Record<string, any> = {}
  if (binding.modifiers.onUpdate) callbacks.onUpdate = binding.value
  if (binding.modifiers.onEnter) callbacks.onEnter = binding.value
  if (binding.modifiers.onEnterBack) callbacks.onEnterBack = binding.value
  if (binding.modifiers.onLeave) callbacks.onLeave = binding.value
  if (binding.modifiers.onLeaveBack) callbacks.onLeaveBack = binding.value
  return callbacks
}

function addMagneticEffect(bundle: GsapBundle, el: HTMLElement, binding: AnyBinding) {
  const strengthModifiers: Record<string, number> = {
    strong: 2,
    stronger: 1.5,
    weaker: 0.75,
    weak: 0.5,
  }
  const handleMouseMove = (e: MouseEvent) => {
    if (!el) return
    const { width, height, left, right, top, bottom } = el.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2
    const deltaX = e.clientX - centerX
    const deltaY = e.clientY - centerY
    const distanceX = left < e.clientX && right > e.clientX
      ? 0
      : Math.min(Math.abs(e.clientX - left), Math.abs(e.clientX - right))
    const distanceY = top < e.clientY && bottom > e.clientY
      ? 0
      : Math.min(Math.abs(e.clientY - top), Math.abs(e.clientY - bottom))
    const strengthFactor = Object.entries(strengthModifiers)
      .find(entry => binding.modifiers[entry[0]])?.[1] || 1
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2)
    const centerDistance = Math.sqrt(deltaX ** 2 + deltaY ** 2)
    const magneticDistanceX = width / 3
    const magneticDistanceY = height / 3
    const attractionStrength = 0.45 * strengthFactor
    if (distance < magneticDistanceX && distance < magneticDistanceY) {
      const strength = Math.abs(1 - centerDistance / 4) / ((magneticDistanceX + magneticDistanceY) / 2)
      bundle.gsap.to(el, {
        x: deltaX * strength * attractionStrength,
        y: deltaY * strength * attractionStrength,
        duration: 0.2,
      })
    }
    else {
      bundle.gsap.to(el, { x: 0, y: 0, duration: 0.3 })
    }
  }
  intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) window.addEventListener('mousemove', handleMouseMove)
      else window.removeEventListener('mousemove', handleMouseMove)
    })
  })
  intersectionObserver.observe(el)
}

function prepareTimeline(bundle: GsapBundle, el: any, binding: AnyBinding, configOptions: any) {
  const { gsap, Draggable } = bundle
  const timelineOptions: any = {}
  const callbacks = prepareCallbacks(binding)
  const once = binding.modifiers.call ?? binding.modifiers.once
  const scroller = configOptions?.scroller
    ?? binding.value?.scroller
    ?? binding.value?.[0]?.scroller
    ?? binding.value?.[1]?.scroller
    ?? undefined
  const scrub = binding.value?.scrub ?? binding.value?.[1]?.scrub ?? (once === true ? false : undefined) ?? true
  const markers = binding.modifiers.markers
  if (binding.modifiers.whenVisible) {
    timelineOptions.scrollTrigger = {
      trigger: el,
      id: el.dataset.gsapId,
      start: binding.value?.start ?? 'top 90%',
      end: binding.value?.end ?? 'top 50%',
      scroller,
      scrub,
      ...callbacks,
      markers,
      toggleActions: binding.modifiers.once
        ? (binding.modifiers.reversible ? 'play none none reverse' : 'play none none none')
        : undefined,
    }
  }
  if (binding.modifiers.pinned) {
    const end = binding.value?.end ?? '+=1000px'
    timelineOptions.scrollTrigger = {
      trigger: el,
      id: el.dataset.gsapId,
      start: binding.value?.start ?? 'center center',
      end,
      scroller,
      scrub,
      pin: true,
      pinSpacing: 'margin',
      ...callbacks,
      markers,
    }
  }
  if (binding.modifiers.parallax) {
    timelineOptions.scrollTrigger = {
      trigger: el,
      id: el.dataset.gsapId,
      start: 'top bottom',
      end: 'bottom top',
      scroller,
      scrub: true,
      ...callbacks,
      markers,
    }
  }
  if (!once && binding.modifiers.parallax) {
    timelineOptions.scrollTrigger.toggleActions = 'restart none none reverse'
  }
  if (binding.modifiers.infinitely) timelineOptions.repeat = -1
  const timeline = gsap.timeline(timelineOptions)
  if (binding.modifiers.parallax) {
    const [parallaxType, parallaxFactor] = Object.keys(binding.modifiers)
      .find(m => m.includes('slower') || m.includes('faster'))
      ?.split('-') as [string, string | undefined]
    const direction = parallaxType === 'slower' ? -1 : 1
    timeline.fromTo(
      el,
      { yPercent: +`${10 * +(parallaxFactor || 5) * direction}` },
      { yPercent: +`${10 * +(parallaxFactor || 5) * direction * -1}`, ease: 'linear' },
    )
  }
  const delayKey = Object.keys(binding.modifiers).find(m => m.includes('delay'))
  if (delayKey) {
    const milliseconds = delayKey.split('-')?.[1] || 500
    timeline.to('body', { duration: +milliseconds / 1e3 })
  }
  const stagger = binding.modifiers.stagger
    ? (binding.value?.stagger ?? binding.value?.[1]?.stagger ?? '0.2')
    : false
  if (binding.modifiers.stagger) el = el.children
  delete binding.value?.start
  delete binding.value?.end
  delete binding.value?.scrub
  delete binding.value?.scroller
  delete binding.value?.markers
  delete binding.value?.toggleActions
  const animationType = Object.keys(binding.modifiers)
    .find(m => ['to', 'from', 'set', 'fromTo', 'call'].includes(m))
  if (animationType === 'to') {
    if (binding.modifiers.fromInvisible) binding.value.opacity = binding.value.opacity || 1
    timeline.to(el, { ...binding.value, stagger })
  }
  if (animationType === 'set') timeline.set(el, { ...binding.value, stagger })
  if (animationType === 'from') {
    timeline.from(el, {
      ...binding.value,
      stagger,
      opacity: binding.value.opacity ?? (binding.modifiers.fromInvisible ? 0 : 1),
      duration: binding.value.duration || 0.5,
    })
    if (binding.modifiers.fromInvisible) {
      timeline.to(el, { opacity: 1, stagger, duration: binding.value.duration || 0.5 }, '<')
    }
  }
  if (animationType === 'fromTo') {
    const values = binding.value
    if (binding.modifiers.stagger) values[1].stagger = stagger
    if (binding.modifiers.fromInvisible) {
      values[0].opacity = 0
      values[1].opacity = values[1].opacity || 1
    }
    timeline.fromTo(el, binding.value?.[0], binding.value?.[1])
  }
  if (binding.modifiers.animateText) {
    const value = typeof binding.value === 'string' ? binding.value : (binding.value?.text || el.textContent)
    if (el.textContent) el.textContent = ''
    const speeds: Record<string, number> = { slow: 0.5, fast: 10 }
    const speed = speeds[Object.keys(binding.modifiers).find(m => Object.keys(speeds).includes(m)) || ''] || 2
    timeline.to(el, { text: { value, speed } })
  }
  if (binding.modifiers.whileHover) {
    timeline.pause()
    el.addEventListener('mouseenter', () => timeline.play())
    el.addEventListener('mouseout', () => {
      if (binding.modifiers.noReverse) timeline.time(0).pause()
      else timeline.play().reverse()
    })
  }
  if (animationType === 'call') timeline.call(binding.value)
  if (binding.modifiers.draggable) {
    const type = Object.keys(binding.modifiers).find(m => ['x', 'y', 'rotation'].includes(m))
    Draggable.create(el, { type: type as any, bounds: binding.value || el.parentElement })
  }
  if (getValueFromModifier(binding, 'onState')) {
    const [dataKey, targetValue = 'true'] = Object.keys(binding.modifiers)
      .find(m => m.toLowerCase().includes('onstate'))!
      .split('-').slice(1) as [string, string | undefined]
    const targetElement = binding.modifiers.inherit
      ? (el?.[0] || el).closest(`*[data-${dataKey}]`)
      : (el?.[0] || el)
    const getCurrentValue = () => targetElement.dataset[dataKey]
    if (getCurrentValue() !== targetValue) timeline.pause()
    observer = new MutationObserver((records) => {
      const event = records.filter(r => r.attributeName === `data-${dataKey}`)?.[0]
      if (!event) return
      if (getCurrentValue() === targetValue) return timeline.play()
      else return timeline.play().reverse()
    })
    observer.observe(targetElement, { attributes: true })
  }
  return timeline
}

function doBeforeMount(bundle: GsapBundle, el: HTMLElement, binding: AnyBinding, vnode: VNode, configOptions: any) {
  binding = loadPreset(binding, configOptions)
  el.dataset.gsapId = crypto.randomUUID()
  el.dataset.vgsapFromInvisible = String(!!binding.modifiers.fromInvisible)
  el.dataset.vgsapStagger = String(!!binding.modifiers.stagger)
  if (!gsapContext) gsapContext = bundle.gsap.context(() => {})
  if (binding.modifiers.timeline) {
    assignChildrenOrderAttributesFor(vnode)
    return nextTick().then(() => {
      globalTimelines[el.dataset.gsapId!] = prepareTimeline(bundle, el, binding, configOptions)
      el.dataset.gsapTimeline = 'true'
      gsapContext.add(() => globalTimelines[el.dataset.gsapId!])
    })
  }
}

function doMounted(bundle: GsapBundle, el: HTMLElement, binding: AnyBinding, configOptions: any) {
  const { gsap, ScrollTrigger } = bundle
  let timeline: any
  const mm = gsap.matchMedia()
  if (binding.modifiers.timeline) {
    globalTimelines[el.dataset.gsapId!]?.scrollTrigger?.refresh()
    ScrollTrigger?.normalizeScroll(true)
  }
  else {
    if (binding.modifiers.magnetic) return addMagneticEffect(bundle, el, binding)
    const breakpoint = configOptions?.breakpoint || 768
    if (binding.modifiers.desktop) {
      mm.add(`(min-width: ${breakpoint}px)`, () => {
        timeline = prepareTimeline(bundle, el, binding, configOptions)
      })
    }
    else if (binding.modifiers.mobile) {
      mm.add(`(max-width: ${breakpoint}px)`, () => {
        timeline = prepareTimeline(bundle, el, binding, configOptions)
      })
    }
    else {
      timeline = prepareTimeline(bundle, el, binding, configOptions)
    }
    if (binding.modifiers.add) {
      let order: string | undefined = getValueFromModifier(binding, 'order-') || getValueFromModifier(binding, 'suggestedOrder-')
      if (binding.modifiers.withPrevious) order = '<'
      const parent = el.closest(`[data-gsap-timeline="true"]`) as HTMLElement | null
      if (!parent?.dataset?.gsapId) return
      globalTimelines[parent.dataset.gsapId]?.add(timeline, order)
    }
  }
  gsapContext.add(() => timeline)
}

function doUnmounted(bundle: GsapBundle, el: HTMLElement) {
  const { ScrollTrigger } = bundle
  ScrollTrigger.getById(el.dataset.gsapId!)?.kill()
  globalTimelines[el.dataset.gsapId!]?.scrollTrigger?.kill()
  gsapContext?.revert()
  if (observer) observer.disconnect()
  if (intersectionObserver) intersectionObserver.disconnect()
}

const elementQueue = new WeakMap<Element, Promise<unknown>>()

function enqueue(el: Element, work: () => unknown) {
  const prev = elementQueue.get(el) ?? Promise.resolve()
  const next = prev.then(work).catch((err) => {
    console.error('[v-gsap] directive error:', err)
  })
  elementQueue.set(el, next)
  return next
}

export default defineNuxtPlugin((nuxtApp) => {
  const configOptions: any = (useRuntimeConfig().public as any).vgsap ?? {}

  nuxtApp.vueApp.directive('gsap', {
    beforeMount(el: HTMLElement, binding, vnode) {
      enqueue(el, async () => {
        const bundle = gsapBundle ?? await loadGsap()
        await doBeforeMount(bundle, el, binding as AnyBinding, vnode as VNode, configOptions)
      })
    },
    mounted(el: HTMLElement, binding) {
      enqueue(el, () => {
        if (!gsapBundle) return
        doMounted(gsapBundle, el, binding as AnyBinding, configOptions)
      })
    },
    unmounted(el: HTMLElement) {
      enqueue(el, () => {
        if (!gsapBundle) return
        doUnmounted(gsapBundle, el)
      }).finally(() => {
        elementQueue.delete(el)
      })
    },
  })
})
