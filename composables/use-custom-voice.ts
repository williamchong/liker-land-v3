import type { CustomVoiceData } from '~/shared/types/custom-voice'

export function useCustomVoice() {
  const customVoice = useState<CustomVoiceData | null>('custom-voice', () => null)
  const isLoading = useState<boolean>('custom-voice-loading', () => false)

  const hasCustomVoice = computed(() => !!customVoice.value?.voiceId)

  async function fetchCustomVoice() {
    isLoading.value = true
    try {
      const data = await $fetch<CustomVoiceData | null>('/api/user/custom-voice')
      customVoice.value = data
    }
    catch (error) {
      console.error('[CustomVoice] Failed to fetch:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  async function uploadCustomVoice(params: { audio: File, voiceName: string, voiceLanguage?: string, avatar?: File, promptAudio?: File, promptText?: string }) {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const formData = new FormData()
      formData.append('audio', params.audio)
      formData.append('voiceName', params.voiceName)
      if (params.voiceLanguage) {
        formData.append('voiceLanguage', params.voiceLanguage)
      }
      if (params.avatar) {
        formData.append('avatar', params.avatar)
      }
      if (params.promptAudio) {
        formData.append('promptAudio', params.promptAudio)
      }
      if (params.promptText) {
        formData.append('promptText', params.promptText)
      }
      const data = await $fetch<CustomVoiceData>('/api/user/custom-voice', {
        method: 'POST',
        body: formData,
      })
      customVoice.value = data
      return data
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateCustomVoiceInfo(fields: { voiceName?: string, voiceLanguage?: string }) {
    if (isLoading.value) return
    isLoading.value = true
    try {
      await $fetch('/api/user/custom-voice', {
        method: 'PATCH',
        body: fields,
      })
      if (customVoice.value) {
        customVoice.value = { ...customVoice.value, ...fields }
      }
    }
    finally {
      isLoading.value = false
    }
  }

  async function removeCustomVoice() {
    if (isLoading.value) return
    isLoading.value = true
    try {
      await $fetch('/api/user/custom-voice', { method: 'DELETE' })
      customVoice.value = null
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    customVoice,
    hasCustomVoice,
    isLoading,
    fetchCustomVoice,
    uploadCustomVoice,
    updateCustomVoiceInfo,
    removeCustomVoice,
  }
}
