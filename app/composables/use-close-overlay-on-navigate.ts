/**
 * Close an app-root overlay when navigation commits.
 *
 * Not `watch(() => route.path)`: a page that unmounts on the same navigation
 * tears the watcher's scope down before its async-flushed callback runs, so the
 * overlay is stranded on the next page. `router.afterEach` fires synchronously
 * during navigation, before unmount. Guarded on path so in-place query updates
 * don't dismiss the overlay.
 */
export function useCloseOverlayOnNavigate(close: () => void) {
  const router = useRouter()
  const stopCloseOnNavigate = router.afterEach((to, from) => {
    if (to.path === from.path) return
    close()
  })
  onScopeDispose(stopCloseOnNavigate)
  return stopCloseOnNavigate
}
