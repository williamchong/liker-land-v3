import { hydrateQueryCache, useQueryCache } from '@pinia/colada'
import type { _UseQueryEntryNodeValueSerialized } from '@pinia/colada'
import type { Pinia } from 'pinia'

export default defineNuxtPlugin({
  name: 'colada-retain-ssr-cache',
  // Run after colada-nuxt ("Pinia Colada"), whose app:rendered hook snapshots
  // the query cache into the payload and then clears it.
  dependsOn: ['Pinia Colada'],
  setup(nuxtApp) {
    nuxtApp.hooks.hook('app:rendered', ({ ssrContext }) => {
      // useHead entries resolve after this hook, so a reactive title reading
      // the cleared cache would render empty (e.g. the product page title).
      // Re-hydrate from the just-serialized payload; the request-scoped cache
      // is discarded with the request anyway.
      const serializedCache = ssrContext?.payload?.pinia_colada as
        Record<string, _UseQueryEntryNodeValueSerialized> | undefined
      if (serializedCache) {
        const queryCache = useQueryCache(nuxtApp.$pinia as Pinia)
        hydrateQueryCache(queryCache, serializedCache)
      }
    })
  },
})
