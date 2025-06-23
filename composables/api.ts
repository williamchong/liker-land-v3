import type { FetchOptions } from 'ofetch'

export function useLikeCoinEVMChainAPI() {
  const config = useRuntimeConfig()
  const fetch = $fetch.create({ baseURL: config.public.likeCoinEVMChainAPIEndpoint })
  return { fetch }
}

export function useLikeCoinAPI() {
  const config = useRuntimeConfig()
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const fetchOptions: FetchOptions = {
    baseURL: config.public.likeCoinAPIEndpoint,
  }
  if (hasLoggedIn && user.value?.token) {
    fetchOptions.headers = { Authorization: `Bearer ${user.value?.token}` }
  }
  const fetch = $fetch.create(fetchOptions)
  return { fetch }
}
