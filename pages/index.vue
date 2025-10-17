<template>
  <main class="justify-center items-center w-full max-w-[1440px] mx-auto px-12 opacity-20">
    <UIcon
      class="animate-spin"
      name="material-symbols-progress-activity"
      size="128"
    />
  </main>
</template>

<script setup lang="ts">
const { loggedIn: hasLoggedIn } = useUserSession()

const route = useRoute()
const url = useRequestURL()
const localeRoute = useLocaleRoute()

const config = useRuntimeConfig()
onMounted(async () => {
  if (config.public.baseUrlStake && url.origin === config.public.baseUrlStake) {
    await navigateTo(
      localeRoute({
        name: hasLoggedIn.value ? 'collective' : 'stake',
        query: route.query,
      }),
      { replace: true },
    )
  }
  else {
    await navigateTo(
      localeRoute({
        name: hasLoggedIn.value ? 'shelf' : 'store',
        query: route.query,
      }),
      { replace: true },
    )
  }
})
</script>
