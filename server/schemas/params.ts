import * as v from 'valibot'

export const NftClassIdParamsSchema = v.object({
  nftClassId: v.pipe(
    v.string('MISSING_NFT_CLASS_ID'),
    v.nonEmpty('MISSING_NFT_CLASS_ID'),
  ),
})

export const TagIdParamsSchema = v.object({
  id: v.pipe(
    v.string('MISSING_TAG_ID'),
    v.nonEmpty('MISSING_TAG_ID'),
  ),
})

export const AnnotationParamsSchema = v.object({
  nftClassId: v.pipe(
    v.string('MISSING_NFT_CLASS_ID'),
    v.nonEmpty('MISSING_NFT_CLASS_ID'),
  ),
  annotationId: v.pipe(
    v.string('MISSING_ANNOTATION_ID'),
    v.nonEmpty('MISSING_ANNOTATION_ID'),
  ),
})
