import { useConnect, useDisconnect } from '@wagmi/vue'
import type { Magic } from 'magic-sdk'

let pendingSessionCheck: Promise<void> | null = null

export function useMagicSession() {
  const { $wagmiConfig } = useNuxtApp()
  const { connectAsync } = useConnect()
  const { disconnectAsync } = useDisconnect()

  async function doEnsureMagicSession() {
    const currentKey = $wagmiConfig.state.current
    const connector = currentKey
      ? $wagmiConfig.state.connections.get(currentKey)?.connector
      : undefined
    if (!connector || connector.id !== 'magic' || !('getMagic' in connector)) return

    let needsReauth = false
    try {
      const magic = await (connector as unknown as { getMagic: () => Promise<Magic> }).getMagic()
      needsReauth = !(await magic.user.isLoggedIn())
    }
    catch {
      needsReauth = true
    }

    if (needsReauth) {
      await disconnectAsync()
      await connectAsync({ connector, chainId: $wagmiConfig.chains[0].id })
    }
  }

  async function ensureMagicSession() {
    if (pendingSessionCheck) {
      return pendingSessionCheck
    }
    pendingSessionCheck = doEnsureMagicSession().finally(() => {
      pendingSessionCheck = null
    })
    return pendingSessionCheck
  }

  return { ensureMagicSession }
}
