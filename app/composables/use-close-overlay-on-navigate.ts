// Close an app-root overlay when navigation commits (router.afterEach avoids route.path watcher teardown on unmount).

export function useCloseOverlayOnNavigate(close: () => void) {
  const router = useRouter()
  const stopCloseOnNavigate = router.afterEach((to, from) => {
    if (to.path === from.path) return
    close()
  })
  onScopeDispose(stopCloseOnNavigate)
  return stopCloseOnNavigate
}
