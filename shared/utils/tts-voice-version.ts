// Client-facing TTS voice ids may end in a `_v<digits>` version; bumping it
// changes request URLs, busting CDN/browser caches keyed on `voice_id`. Bases
// may contain underscores (`corrupt_alex` vs `corrupt_hung` never conflate).
const TTS_VOICE_VERSION_RE = /^(.+)_v(\d+)$/

export function parseTTSVoiceVersion(voiceId: string): { base: string, version: number } {
  const match = TTS_VOICE_VERSION_RE.exec(voiceId)
  return match ? { base: match[1] as string, version: Number(match[2]) } : { base: voiceId, version: 0 }
}

export function stripTTSVoiceVersion(voiceId: string): string {
  return parseTTSVoiceVersion(voiceId).base
}

// Current ids of versioned voices, shared by the server VOICE_CONFIG key, the
// client option list, and sample configs — a bump missed in one layer would be
// masked by the fallback resolver, silently skipping the CDN cache-bust.
export const PHOEBE_VOICE_ID = 'phoebe_v28'
export const PHOEBE_V26_VOICE_ID = 'phoebe_v26'
