export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  const query = getQuery(event)
  const nftClassId = query.nftClassId
  const nftClassIds = query.nftClassIds

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  if (nftClassId && typeof nftClassId === 'string') {
    try {
      const settings = await getBookSettings(walletAddress, nftClassId)
      return settings || {}
    }
    catch (error) {
      console.error(`Failed to get book settings for ${nftClassId}:`, error)
      throw createError({
        statusCode: 500,
        message: 'FAILED_TO_GET_BOOK_SETTINGS',
      })
    }
  }

  if (nftClassIds) {
    const nftClassIdArray = Array.isArray(nftClassIds) ? nftClassIds : [nftClassIds]
    try {
      const settings = await getBatchBookSettings(walletAddress, nftClassIdArray)
      return settings
    }
    catch (error) {
      console.error('Failed to get batch book settings:', error)
      throw createError({
        statusCode: 500,
        message: 'FAILED_TO_GET_BATCH_BOOK_SETTINGS',
      })
    }
  }

  throw createError({
    statusCode: 400,
    message: 'MISSING_NFT_CLASS_ID_OR_IDS',
  })
})
