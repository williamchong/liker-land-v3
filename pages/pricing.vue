<template>
  <AppHeader :is-connect-hidden="false" />
</template>

<script setup lang="ts">
const router = useRouter()
const subscription = useSubscription()

const hasOpened = ref(false)

onMounted(async () => {
  const isSubscribed = await subscription.redirectIfSubscribed()
  if (isSubscribed) return

  if (!hasOpened.value) {
    hasOpened.value = true
    subscription.paywallModal.open({
      isFullscreen: true,
      isBackdropDismissible: false,
      onClose: () => {
        router.back()
      },
    })
  }
})
</script>
