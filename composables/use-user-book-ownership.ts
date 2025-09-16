export function useUserBookOwnership(nftClassId: MaybeRef<string>) {
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const bookshelfStore = useBookshelfStore()

  const isChecking = ref(false)
  const hasChecked = ref(false)

  const nftClassIdRef = computed(() => toValue(nftClassId))

  const isOwner = computed(() => {
    if (!nftClassIdRef.value || !hasLoggedIn.value || !user.value?.evmWallet) {
      return false
    }

    const nfts = bookshelfStore.getNFTsByNFTClassId(nftClassIdRef.value)
    return nfts.length > 0
  })

  async function checkOwnership() {
    if (!nftClassIdRef.value || !hasLoggedIn.value || !user.value?.evmWallet || isChecking.value) {
      return false
    }

    try {
      isChecking.value = true

      // First check if we already have the NFT in the bookshelf store
      const existingNFTs = bookshelfStore.getNFTsByNFTClassId(nftClassIdRef.value)
      if (existingNFTs.length > 0) {
        hasChecked.value = true
        return true
      }

      // If not found in store, check via contract
      await bookshelfStore.fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract(
        nftClassIdRef.value,
        user.value.evmWallet,
      )

      hasChecked.value = true
      return isOwner.value
    }
    catch (error) {
      console.error(`Failed to check user's book ownership:`, error)
      hasChecked.value = true
      return false
    }
    finally {
      isChecking.value = false
    }
  }

  // Auto-check ownership when user login or NFT class ID changes
  watch([hasLoggedIn, () => user.value?.evmWallet, nftClassIdRef], () => {
    if (
      import.meta.client
        && hasLoggedIn.value
        && user.value?.evmWallet
        && nftClassIdRef.value
    ) {
      checkOwnership()
    }
    else {
      hasChecked.value = false
    }
  }, { immediate: true })

  return {
    isOwner: readonly(isOwner),
    isChecking: readonly(isChecking),
    hasChecked: readonly(hasChecked),
    checkOwnership,
  }
}
