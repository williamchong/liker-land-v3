import { describe, expect, it } from 'vitest'
import { getAffiliateVoicesForBook, getAffiliateVoicesFromSources } from '~/composables/use-plus-affiliate'
import type { AffiliatePublicConfig, AffiliateVoiceSource } from '~~/shared/types/affiliate'

const VOICES = [{ id: 'chiming', name: 'Chiming' }]

// Publisher wallets are stored checksummed (EIP-55), unlike the lowercased class IDs.
const PUBLISHER_WALLET = '0xabCDeF0123456789AbcdEf0123456789aBCDEF01'
const STRANGER_WALLET = '0xfEdcBA9876543210FedCBa9876543210fEdCBa98'

const activeConfig: AffiliatePublicConfig = {
  active: true,
  affiliateClassIds: ['0xaaa'],
  affiliatePublisherWallets: [PUBLISHER_WALLET],
  customVoices: VOICES,
}

describe('getAffiliateVoicesForBook', () => {
  it('returns no voices when config is null or inactive', () => {
    expect(getAffiliateVoicesForBook(null, '0xaaa')).toEqual([])
    expect(getAffiliateVoicesForBook({ active: false }, '0xaaa')).toEqual([])
  })

  it('returns no voices when nftClassId is missing', () => {
    expect(getAffiliateVoicesForBook(activeConfig, undefined)).toEqual([])
  })

  it('grants voices when the book is in affiliateClassIds (case-insensitive)', () => {
    expect(getAffiliateVoicesForBook(activeConfig, '0xAAA')).toEqual(VOICES)
  })

  it('grants voices when the book is listed by a publisher wallet (checksum-insensitive)', () => {
    // Lowercased owner wallet still matches the checksummed config entry.
    expect(getAffiliateVoicesForBook(activeConfig, '0xother', PUBLISHER_WALLET.toLowerCase())).toEqual(VOICES)
  })

  it('denies when neither the classId nor the owner wallet match', () => {
    expect(getAffiliateVoicesForBook(activeConfig, '0xother', STRANGER_WALLET)).toEqual([])
    expect(getAffiliateVoicesForBook(activeConfig, '0xother')).toEqual([])
  })
})

const SELF_VOICE = { id: 'self-voice', name: 'Self' }
const REFERRER_VOICE = { id: 'referrer-voice', name: 'Referrer' }
const SHARED_VOICE = { id: 'shared-voice', name: 'Shared' }

const selfSource: AffiliateVoiceSource = {
  likerId: 'self',
  isSelf: true,
  affiliateClassIds: ['0xaaa'],
  affiliatePublisherWallets: [PUBLISHER_WALLET],
  customVoices: [SELF_VOICE, SHARED_VOICE],
}

const referrerSource: AffiliateVoiceSource = {
  likerId: 'referrer',
  isSelf: false,
  affiliateClassIds: ['0xbbb'],
  affiliatePublisherWallets: [STRANGER_WALLET],
  customVoices: [REFERRER_VOICE, SHARED_VOICE],
}

describe('getAffiliateVoicesFromSources', () => {
  it('returns no voices when nftClassId is missing', () => {
    expect(getAffiliateVoicesFromSources([selfSource], undefined)).toEqual([])
  })

  it('merges voices across sources that both scope the book', () => {
    // 0xaaa is in self scope; STRANGER_WALLET owner puts it in referrer scope too.
    const voices = getAffiliateVoicesFromSources([selfSource, referrerSource], '0xaaa', STRANGER_WALLET)
    expect(voices).toEqual([SELF_VOICE, SHARED_VOICE, REFERRER_VOICE])
  })

  it('dedupes a voice id surfaced by multiple in-scope sources', () => {
    // Both sources scope 0xaaa and carry the same SHARED_VOICE; it must appear once.
    const a = { ...selfSource, customVoices: [SHARED_VOICE] }
    const b = { ...referrerSource, affiliateClassIds: ['0xaaa'], customVoices: [SHARED_VOICE] }
    expect(getAffiliateVoicesFromSources([a, b], '0xaaa')).toEqual([SHARED_VOICE])
  })

  it('only includes voices from sources whose scope matches the book', () => {
    // 0xbbb matches only the referrer source; the self source is out of scope.
    expect(getAffiliateVoicesFromSources([selfSource, referrerSource], '0xbbb')).toEqual([REFERRER_VOICE, SHARED_VOICE])
  })

  it('returns no voices when no source scopes the book', () => {
    expect(getAffiliateVoicesFromSources([selfSource, referrerSource], '0xnope')).toEqual([])
  })
})
