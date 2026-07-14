import type { DefineQueryOptions, QueryCache } from '@pinia/colada'

// Never stale and never collected within a session; Pinia Colada has no
// query-level retries, which is what we want — the fetchers already retry
// via createRetryingFetch. Spread and override staleTime for always-stale
// queries.
export const cacheForeverQueryOptions = {
  staleTime: Infinity,
  gcTime: false,
  refetchOnWindowFocus: false,
} as const

// Captures the Nuxt app at options-build time: query fns run outside Nuxt's
// ambient context on the server. tryUseNuxtApp because disabled queries
// re-evaluate options in watcher callbacks, where the instance may be
// unavailable on the server (the query fn never runs there, so the context
// is not needed).
export function wrapQueryFnWithNuxtContext<T>(fetchData: () => Promise<T>): () => Promise<T> {
  const nuxtApp = tryUseNuxtApp()
  return () => (nuxtApp ? nuxtApp.runWithContext(fetchData) : fetchData())
}

// refresh() fetches only when stale and dedupes against any in-flight fetch;
// a failed fetch rejects with the original fetcher error (e.g. the FetchError
// 404 callers branch on).
export async function refreshQueryData<T>(
  queryCache: QueryCache,
  options: DefineQueryOptions<T>,
): Promise<T | undefined> {
  const state = await queryCache.refresh(queryCache.ensure(options))
  return state.data
}
