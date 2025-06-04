const LANG_MAPPING = {
  'en-US': 'English',
  'zh-TW': 'Chinese',
  'zh-HK': 'Chinese,Yue',
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (!session) {
    throw createError({
      status: 401,
      message: 'UNAUTHORIZED',
    })
  }
  const config = useRuntimeConfig()
  const {
    minimaxGroupId,
    minimaxAPIKey,
  } = config
  const { text, language: rawLanguage } = getQuery(event)
  if (!text || typeof text !== 'string') {
    throw createError({
      status: 400,
      message: 'MISSING_TEXT',
    })
  }
  if (!rawLanguage || typeof rawLanguage !== 'string' || !(rawLanguage in LANG_MAPPING)) {
    throw createError({
      status: 400,
      message: 'INVALID_LANGUAGE',
    })
  }
  const language = rawLanguage as keyof typeof LANG_MAPPING
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}"`)

  try {
    const command = {
      text: text,
      stream: true,
      model: 'speech-02-hd',
      voice_setting: {
        voice_id: 'Chinese (Mandarin)_Warm_Bestie',
        speed: 0.95,
        pitch: -1,
        emotion: 'neutral',
      },
      language_boost: LANG_MAPPING[language],
    }

    interface TTSChunk {
      data: {
        audio: string
        status: number // 1: streaming chunk, 2: final summary chunk
      }
      trace_id: string
      base_resp: {
        status_code: number
        status_msg: string
      }
      extra_info?: {
        audio_length: number
        audio_sample_rate: number
        audio_size: number
        audio_bitrate: number
        word_count: number
        invisible_character_ratio: number
        audio_format: string
        usage_characters: number
      }
    }

    const response = await $fetch<ReadableStream>(`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${minimaxGroupId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${minimaxAPIKey}`,
      },
      responseType: 'stream',
      body: command,
    })

    let buffer = ''
    const bufferStream = new TransformStream({
      start() {
        buffer = ''
      },
      transform(chunk, controller) {
        if (chunk === null) {
          controller.terminate()
          return
        }
        if (!(chunk instanceof Uint8Array)) {
          console.warn(`[Speech] Unexpected chunk type for user ${session.user.evmWallet}`)
          controller.error('INVALID_STREAM_DATA: Received invalid data from text-to-speech service')
          return
        }
        try {
          const string = new TextDecoder().decode(chunk)
          buffer += string
          let eventEndIndex = buffer.indexOf('\n\n')
          while (eventEndIndex !== -1) {
            const event = buffer.substring(0, eventEndIndex).trim()
            buffer = buffer.substring(eventEndIndex + 2) // '\n\n' is 2 characters long
            if (event) {
              const dataMatch = event.match(/^data:\s*(.+)$/m)
              if (dataMatch) {
                const jsonStr = dataMatch[1].trim()
                if (jsonStr) {
                  try {
                    const parsed: TTSChunk = JSON.parse(jsonStr)
                    if (parsed.base_resp?.status_code !== 0) {
                      console.error(`[Speech] TTS API error for user ${session.user.evmWallet}:`, parsed.base_resp)
                      controller.error(`TTS_API_ERROR: ${parsed.base_resp?.status_msg || 'Unknown API error'}`)
                      return
                    }
                    if (parsed.data.status === 1 && parsed.data.audio) {
                      const audioBuffer = Buffer.from(parsed.data.audio, 'hex')
                      controller.enqueue(audioBuffer)
                    }
                  }
                  catch (jsonError) {
                    console.error(`[Speech] Error parsing JSON for user ${session.user.evmWallet}:`, jsonError)
                    controller.error('TTS_JSON_PARSE_ERROR: Failed to parse text-to-speech data')
                    return
                  }
                }
              }
            }
            eventEndIndex = buffer.indexOf('\n\n')
          }
        }
        catch (error) {
          console.error(`[Speech] Error processing chunk for user ${session.user.evmWallet}:`, error)
          controller.error('TTS_PROCESSING_ERROR: Failed to process text-to-speech data')
          return
        }
      },
      flush(controller) {
        if (buffer.trim()) {
          try {
            const dataMatch = buffer.match(/^data:\s*(.+)$/m)
            if (dataMatch) {
              const jsonStr = dataMatch[1].trim()
              if (jsonStr) {
                try {
                  const parsed: TTSChunk = JSON.parse(jsonStr)
                  if (parsed.data.status === 1 && parsed.data.audio) {
                    const audioBuffer = Buffer.from(parsed.data.audio, 'hex')
                    controller.enqueue(audioBuffer)
                  }
                }
                catch (jsonError) {
                  console.warn(`[Speech] Error parsing final JSON for user ${session.user.evmWallet}:`, jsonError)
                }
              }
            }
          }
          catch (error) {
            console.warn(`[Speech] Error parsing final buffer for user ${session.user.evmWallet}:`, error)
          }
        }
      },
    })

    response.pipeThrough(bufferStream)
    setHeader(event, 'content-type', 'audio/mpeg')
    setHeader(event, 'cache-control', 'public, max-age=14400')
    return sendStream(event, bufferStream.readable)
  }
  catch (error) {
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
