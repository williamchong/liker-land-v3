// Root segments of the Pinia Colada query keys, shared with colada.options.ts
// so the persistence allowlist can never drift from the composables' keys.
export const NFT_CLASS_QUERY_KEY = 'nft-class'
export const BOOKSTORE_INFO_QUERY_KEY = 'bookstore-info'
export const BOOKSTORE_CMS_TAGS_QUERY_KEY = 'cms-tags'
export const BOOKSTORE_CMS_TAG_QUERY_KEY = 'cms-tag'

export const PERSISTED_QUERY_KEY_ROOTS: string[] = [
  NFT_CLASS_QUERY_KEY,
  BOOKSTORE_INFO_QUERY_KEY,
  BOOKSTORE_CMS_TAGS_QUERY_KEY,
  BOOKSTORE_CMS_TAG_QUERY_KEY,
]
