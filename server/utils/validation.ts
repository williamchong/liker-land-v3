import type { MultiPartData } from 'h3'
import * as v from 'valibot'

/**
 * Creates an h3-compatible validation function from a Valibot schema.
 * Use with `readValidatedBody()`, `getValidatedQuery()`, or `getValidatedRouterParams()`.
 */
export function createValidator<T extends v.GenericSchema>(schema: T) {
  return (data: unknown): v.InferOutput<T> => {
    const result = v.safeParse(schema, data)
    if (result.success) {
      return result.output
    }
    const firstIssue = result.issues[0]
    throw createError({
      statusCode: 400,
      message: firstIssue.message,
    })
  }
}

/**
 * Validates a multipart file part for MIME type and size.
 */
export function validateFilePart(
  part: MultiPartData | undefined,
  options: {
    fieldName: string
    allowedTypes: string[]
    maxSize: number
    required?: boolean
    errorMessages?: {
      missing?: string
      invalidFormat?: string
      tooLarge?: string
    }
  },
): void {
  const {
    fieldName,
    allowedTypes,
    maxSize,
    required = true,
    errorMessages,
  } = options

  const upperField = fieldName.replace(/([A-Z])/g, '_$1').toUpperCase()
  const missingMsg = errorMessages?.missing ?? `MISSING_${upperField}`
  const formatMsg = errorMessages?.invalidFormat ?? `INVALID_${upperField}_FORMAT`
  const sizeMsg = errorMessages?.tooLarge ?? `${upperField}_TOO_LARGE`

  if (!part?.data) {
    if (required) {
      throw createError({ statusCode: 400, message: missingMsg })
    }
    return
  }

  if (!part.type || !allowedTypes.includes(part.type)) {
    throw createError({ statusCode: 400, message: formatMsg })
  }

  if (part.data.length > maxSize) {
    throw createError({ statusCode: 400, message: sizeMsg })
  }
}
