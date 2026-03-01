export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const evmWallet = session?.user?.evmWallet
  const likerId = session?.user?.likerId

  await clearUserSession(event)

  publishEvent(event, 'UserLogout', { evmWallet, likerId })
})
