export default defineNuxtPlugin(() => {
  const { isApp } = useAppDetection()

  if (isApp.value) {
    return
  }

  useScriptStripe({
    version: 'dahlia',
    scriptOptions: {
      trigger: useScriptTriggerIdleTimeout({ timeout: 1000 }),
    },
  })
})
