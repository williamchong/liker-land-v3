import * as v from 'valibot'

export const LoginBodySchema = v.object({
  walletAddress: v.pipe(
    v.string('MISSING_ADDRESS'),
    v.nonEmpty('MISSING_ADDRESS'),
    v.regex(/^0x[a-fA-F0-9]{40}$/, 'INVALID_ADDRESS'),
  ),
  message: v.pipe(
    v.string('MISSING_MESSAGE'),
    v.nonEmpty('MISSING_MESSAGE'),
  ),
  signature: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
  email: v.optional(v.string()),
  loginMethod: v.optional(v.string()),
})

export const RegisterBodySchema = v.object({
  walletAddress: v.pipe(
    v.string('REGISTER_MISSING_ADDRESS'),
    v.nonEmpty('REGISTER_MISSING_ADDRESS'),
    v.regex(/^0x[a-fA-F0-9]{40}$/, 'REGISTER_INVALID_ADDRESS'),
  ),
  message: v.pipe(
    v.string('REGISTER_MISSING_MESSAGE'),
    v.nonEmpty('REGISTER_MISSING_MESSAGE'),
  ),
  signature: v.pipe(
    v.string('REGISTER_MISSING_SIGNATURE'),
    v.nonEmpty('REGISTER_MISSING_SIGNATURE'),
  ),
  email: v.optional(v.string()),
  accountId: v.optional(v.string()),
  loginMethod: v.optional(v.string()),
  magicUserId: v.optional(v.string()),
  magicDIDToken: v.optional(v.string()),
  locale: v.optional(v.string()),
})

export const AccountDeleteBodySchema = v.object({
  wallet: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
  signMethod: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
  authorizeSignature: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
  authorizeMessage: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
  deleteSignature: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
  deleteMessage: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
})
