import * as v from 'valibot'

export const nftClassIdField = v.pipe(
  v.string('MISSING_NFT_CLASS_ID'),
  v.nonEmpty('MISSING_NFT_CLASS_ID'),
  v.regex(/^0x[0-9a-fA-F]{40}$/, 'INVALID_NFT_CLASS_ID'),
)

export const NFTClassIdParamsSchema = v.object({
  nftClassId: nftClassIdField,
})

export const TagIdParamsSchema = v.object({
  id: v.pipe(
    v.string('MISSING_TAG_ID'),
    v.nonEmpty('MISSING_TAG_ID'),
  ),
})

export const AnnotationParamsSchema = v.object({
  nftClassId: nftClassIdField,
  annotationId: v.pipe(
    v.string('MISSING_ANNOTATION_ID'),
    v.nonEmpty('MISSING_ANNOTATION_ID'),
  ),
})
