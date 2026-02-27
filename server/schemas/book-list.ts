import * as v from 'valibot'

export const BookListBodySchema = v.object({
  nftClassId: v.pipe(
    v.string('nftClassId is required in body'),
    v.nonEmpty('nftClassId is required in body'),
  ),
  priceIndex: v.optional(v.number(), 0),
})

export const BookListQuerySchema = v.object({
  nft_class_id: v.pipe(
    v.string('nft_class_id is required in query'),
    v.nonEmpty('nft_class_id is required in query'),
  ),
  price_index: v.optional(v.string()),
})
