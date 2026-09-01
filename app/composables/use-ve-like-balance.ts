import { useReadContract } from '@wagmi/vue'
import { erc20Abi } from 'viem'

// veLIKE is an ERC-4626 vault, so its share balance reads as a plain ERC-20.
// Shares are not LIKE — only expose the raw balance, which is all a "holds any
// veLIKE" check needs; a displayed figure has to go through convertToAssets.
export function useVeLikeBalance(walletAddress: MaybeRefOrGetter<string | undefined>) {
  const config = useRuntimeConfig()

  const args = computed((): [`0x${string}`] | undefined => {
    const address = toValue(walletAddress)
    return address ? [address as `0x${string}`] : undefined
  })

  const { data, refetch } = useReadContract({
    address: config.public.likeCoinVeTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args,
    query: {
      // vue-query subscribes its observer during setup and fetches on the
      // server too, where the result is never awaited into the payload.
      enabled: computed(() => import.meta.client && !!toValue(walletAddress)),
    },
  })

  const veLikeBalance = computed<bigint>(() => (data.value as bigint) || 0n)

  return {
    refetch,
    veLikeBalance,
  }
}
