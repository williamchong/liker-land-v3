export function useGeolocation() {
  const detectedCountry = useState<string>('detected-country', () => {
    // Try to get country from Cloudflare IP Geolocation header
    if (import.meta.server) {
      const headers = useRequestHeaders()
      const country = headers['cf-ipcountry']?.toUpperCase()
      return country || 'US'
    }

    return 'US'
  })

  return {
    detectedCountry: readonly(detectedCountry),
  }
}
