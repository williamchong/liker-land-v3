import { sdk } from '@farcaster/miniapp-sdk'

export default defineNuxtPlugin(async () => {
  if (import.meta.client) {
    try {
      await sdk.actions.ready()
    }
    catch (error) {
      console.error('Failed to initialize Farcaster frame:', error)
    }
  }
})
