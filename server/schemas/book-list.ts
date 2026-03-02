import * as v from 'valibot'

export const BookListBodySchema = v.object({
  nftClassId: v.pipe(
    v.string('MISSING_NFT_CLASS_ID'),
    v.nonEmpty('MISSING_NFT_CLASS_ID'),
  ),
  priceIndex: v.optional(v.number(), 0),
})

export const BookListQuerySchema = v.object({
  nft_class_id: v.pipe(
    v.string('MISSING_NFT_CLASS_ID'),
    v.nonEmpty('MISSING_NFT_CLASS_ID'),
  ),
  price_index: v.optional(v.string()),
})
