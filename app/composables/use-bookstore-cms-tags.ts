import type { DefineQueryOptions, EntryKey, QueryCache } from '@pinia/colada'

const bookstoreCMSTagsQueryKey: EntryKey = [BOOKSTORE_CMS_TAGS_QUERY_KEY]

function getBookstoreCMSTagQueryKey(tagId: string): EntryKey {
  return [BOOKSTORE_CMS_TAG_QUERY_KEY, tagId]
}

// The ordered tag list is stored whole under one key, so the ids and their
// data can never desync.
function getBookstoreCMSTagsQueryOptions(queryCache: QueryCache): DefineQueryOptions<BookstoreCMSTag[]> {
  return {
    ...cacheForeverQueryOptions,
    key: bookstoreCMSTagsQueryKey,
    // Always stale: every explicit fetch refetches (parity with the old
    // fetcher), while in-flight dedupe replaces its isFetching guard.
    staleTime: 0,
    query: wrapQueryFnWithNuxtContext(async () => {
      const data = await fetchBookstoreCMSTagsForAll()
      // Seed per-tag entries so by-id lookups resolve from the list fetch.
      for (const tag of data.records) {
        queryCache.setQueryData(getBookstoreCMSTagQueryKey(tag.id), tag)
      }
      return data.records
    }),
  }
}

function getBookstoreCMSTagQueryOptions(tagId: string): DefineQueryOptions<BookstoreCMSTag> {
  return {
    ...cacheForeverQueryOptions,
    key: getBookstoreCMSTagQueryKey(tagId),
    query: wrapQueryFnWithNuxtContext(() => fetchBookstoreCMSTagById(tagId)),
  }
}

export async function fetchBookstoreCMSTagsThroughCache(
  queryCache: QueryCache,
): Promise<BookstoreCMSTag[] | undefined> {
  return refreshQueryData(queryCache, getBookstoreCMSTagsQueryOptions(queryCache))
}

// Rejects with the original fetcher error, so callers keep their FetchError
// 404 branching for unknown tag ids.
export async function fetchBookstoreCMSTagThroughCache(
  queryCache: QueryCache,
  tagId: string,
): Promise<BookstoreCMSTag | undefined> {
  return refreshQueryData(queryCache, getBookstoreCMSTagQueryOptions(tagId))
}

export function getBookstoreCMSTagsFromCache(queryCache: QueryCache): BookstoreCMSTag[] {
  return queryCache.getQueryData<BookstoreCMSTag[]>(bookstoreCMSTagsQueryKey) ?? []
}

export function getHasFetchedBookstoreCMSTagsFromCache(queryCache: QueryCache): boolean {
  return queryCache.get(bookstoreCMSTagsQueryKey)?.state.value.status === 'success'
}

export function getBookstoreCMSTagByIdFromCache(
  queryCache: QueryCache,
  tagId: string,
): BookstoreCMSTag | undefined {
  return queryCache.getQueryData<BookstoreCMSTag>(getBookstoreCMSTagQueryKey(tagId))
}
