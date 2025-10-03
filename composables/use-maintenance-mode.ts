const WHITELISTED_ROUTE_NAMES = [
  'about',
]

export function useMaintenanceMode() {
  const config = useRuntimeConfig()
  const route = useRoute()
  const getRouteQuery = useRouteQuery()
  const getRouteBaseName = useRouteBaseName()

  const shouldOverrideMaintenancePage = computed(() => {
    return getRouteQuery('maintenance') === '0'
  })

  const isWhitelistedRoute = computed(() => {
    const routeName = getRouteBaseName(route)
    return !!routeName && WHITELISTED_ROUTE_NAMES.includes(routeName)
  })

  const isShowMaintenancePage = computed(() => (
    config.public.isMaintenanceMode
    && !shouldOverrideMaintenancePage.value
    && !isWhitelistedRoute.value
  ))

  return {
    isShowMaintenancePage,
  }
}
