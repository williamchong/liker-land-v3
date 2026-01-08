import type { BookSettingsData } from '~/types/book-settings'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  const nftClassId = getRouterParam(event, 'nftClassId')
  if (!nftClassId) {
    throw createError({
      statusCode: 400,
      message: 'MISSING_NFT_CLASS_ID',
    })
  }

  let body: Partial<BookSettingsData> | undefined
  try {
    body = await readBody(event)
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 400,
      message: 'INVALID_BODY',
    })
  }

  if (!body) {
    throw createError({
      statusCode: 400,
      message: 'MISSING_BODY',
    })
  }

  // Validate that only known keys are present
  const allowedKeys: (keyof BookSettingsData)[] = [
    'epub-cfi',
    'epub-fontSize',
    'epub-activeTTSElementIndex',
    'pdf-currentPage',
    'pdf-scale',
    'pdf-isDualPageMode',
    'pdf-isRightToLeft',
    'progress',
    'lastOpenedTime',
  ]

  const bodyKeys = Object.keys(body)
  const invalidKeys = bodyKeys.filter(key => !allowedKeys.includes(key as keyof BookSettingsData))

  if (invalidKeys.length > 0) {
    throw createError({
      statusCode: 400,
      message: `INVALID_KEYS: ${invalidKeys.join(', ')}`,
    })
  }

  try {
    await updateBookSettings(walletAddress, nftClassId, body)
    return { success: true }
  }
  catch (error) {
    console.error(`Failed to update book settings for ${nftClassId}:`, error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_UPDATE_BOOK_SETTINGS',
    })
  }
})
