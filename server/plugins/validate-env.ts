export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  const sessionPassword = config.session?.password
  if (!import.meta.dev && (!sessionPassword || sessionPassword.length < 32)) {
    throw new Error('[env] NUXT_SESSION_PASSWORD must be at least 32 characters')
  }

  const optionalVars: Record<string, string | undefined> = {
    minimaxApiKey: config.minimaxApiKey as string | undefined,
    minimaxGroupId: config.minimaxGroupId as string | undefined,
    azureSpeechKey: config.azureSpeechKey as string | undefined,
    azureSpeechRegion: config.azureSpeechRegion as string | undefined,
    airtableApiKey: config.airtableApiKey as string | undefined,
  }

  for (const [name, value] of Object.entries(optionalVars)) {
    if (!value) {
      console.warn(`[env] Missing optional var: ${name} — related features will be unavailable`)
    }
  }
})
