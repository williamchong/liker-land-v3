export default defineEventHandler(async (event) => {
  const wallet = await requireUserWallet(event)

  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  try {
    const settings = await getUserSettings(wallet)
    return settings || {}
  }
  catch (error) {
    console.error('Error fetching user settings:', error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_GET_USER_SETTINGS',
    })
  }
})
