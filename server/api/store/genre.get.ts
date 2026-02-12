import { FetchError } from 'ofetch'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const genre = (Array.isArray(query.q) ? query.q[0] : query.q) || undefined
    const pageSize = (Array.isArray(query.limit) ? query.limit[0] : query.limit) || 100
    const offset = (Array.isArray(query.offset) ? query.offset[0] : query.offset) || undefined

    if (!genre) {
      throw createError({
        status: 400,
        message: 'GENRE_REQUIRED',
      })
    }

    const result = await fetchAirtableCMSPublicationsByGenre(genre, {
      pageSize,
      offset,
    })
    setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=600')
    return result
  }
  catch (error) {
    if (error instanceof FetchError) {
      const { statusCode: code, data } = error
      const type = data?.error?.type
      if (code === 401 && type === 'AUTHENTICATION_REQUIRED') {
        throw createError({
          status: 401,
          message: 'INVALID_API_SECRET',
        })
      }
    }
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'UNEXPECTED_ERROR',
    })
  }
})
