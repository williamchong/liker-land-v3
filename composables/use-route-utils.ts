export function useRouteQuery() {
  return function getRouteQuery(key: string, defaultValue = '') {
    const route = useRoute()
    const value = route.query[key]
    return (Array.isArray(value) ? value[0] : value) || defaultValue
  }
}

export function useRouteParam() {
  return function getRouteParam(key: string, defaultValue = '') {
    const route = useRoute()
    const value = route.params[key]
    return (Array.isArray(value) ? value[0] : value) || defaultValue
  }
}
