import { BookListBodySchema } from '~/server/schemas/book-list'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet
  const { nftClassId, priceIndex } = await readValidatedBody(event, useValidation(BookListBodySchema))

  await deleteUserBookListItem(userWallet, nftClassId, priceIndex)
})
