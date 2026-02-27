import * as v from 'valibot'

import { ANNOTATION_NOTE_MAX_LENGTH, ANNOTATION_TEXT_MAX_LENGTH } from '~/constants/annotations'

const AnnotationColorSchema = v.picklist(
  ['yellow', 'red', 'green', 'blue'] as const,
  'MISSING_OR_INVALID_COLOR',
)

export const AnnotationCreateSchema = v.object({
  cfi: v.pipe(
    v.string('MISSING_OR_INVALID_CFI'),
    v.nonEmpty('MISSING_OR_INVALID_CFI'),
  ),
  text: v.pipe(
    v.string('MISSING_OR_INVALID_TEXT'),
    v.nonEmpty('MISSING_OR_INVALID_TEXT'),
    v.maxLength(ANNOTATION_TEXT_MAX_LENGTH, 'TEXT_TOO_LONG'),
  ),
  color: AnnotationColorSchema,
  note: v.optional(v.pipe(
    v.string('INVALID_NOTE'),
    v.maxLength(ANNOTATION_NOTE_MAX_LENGTH, 'INVALID_NOTE'),
  )),
  chapterTitle: v.optional(v.string('INVALID_CHAPTER_TITLE')),
})

export const AnnotationUpdateSchema = v.pipe(
  v.object({
    color: v.optional(AnnotationColorSchema),
    note: v.optional(v.pipe(
      v.string('INVALID_NOTE'),
      v.maxLength(ANNOTATION_NOTE_MAX_LENGTH, 'INVALID_NOTE'),
    )),
  }),
  v.check(
    input => input.color !== undefined || input.note !== undefined,
    'MISSING_UPDATE_FIELDS',
  ),
)
