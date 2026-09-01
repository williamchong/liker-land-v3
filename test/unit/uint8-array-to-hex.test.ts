import { describe, expect, it } from 'vitest'
import type { Uint8ArrayWithToHex } from '~/utils/uint8-array-to-hex'
import { installUint8ArrayToHex } from '~/utils/uint8-array-to-hex'

const proto = Uint8Array.prototype as Uint8ArrayWithToHex

function toHexOf(bytes: Uint8Array) {
  return (bytes as Uint8ArrayWithToHex).toHex!()
}

// Stands in for a Chromium below 140 or a WebKit below Safari 26, which is
// where pdf.js's fingerprint call fails and no page ever paints.
function withoutNativeToHex(run: () => void) {
  const native = Object.getOwnPropertyDescriptor(proto, 'toHex')
  delete proto.toHex
  try {
    run()
  }
  finally {
    delete proto.toHex
    if (native) Object.defineProperty(proto, 'toHex', native)
  }
}

describe('installUint8ArrayToHex', () => {
  it('pads every byte to two digits', () => {
    withoutNativeToHex(() => {
      installUint8ArrayToHex()
      expect(toHexOf(new Uint8Array([0, 15, 16, 255]))).toBe('000f10ff')
    })
  })

  it('returns an empty string for an empty array', () => {
    withoutNativeToHex(() => {
      installUint8ArrayToHex()
      expect(toHexOf(new Uint8Array([]))).toBe('')
    })
  })

  // pdf.js hashes a byte range into a document fingerprint, so the shim has to
  // agree with the native method it stands in for, digit for digit.
  it.runIf(typeof proto.toHex === 'function')(
    'matches the native implementation byte for byte',
    () => {
      const bytes = new Uint8Array(256).map((_, index) => index)
      const expected = toHexOf(bytes)
      withoutNativeToHex(() => {
        installUint8ArrayToHex()
        expect(toHexOf(bytes)).toBe(expected)
      })
    },
  )

  it('does not enumerate on the prototype', () => {
    withoutNativeToHex(() => {
      installUint8ArrayToHex()
      expect(Object.keys(proto)).not.toContain('toHex')
    })
  })

  it('leaves an existing implementation alone', () => {
    withoutNativeToHex(() => {
      installUint8ArrayToHex()
      const before = proto.toHex
      installUint8ArrayToHex()
      expect(proto.toHex).toBe(before)
    })
  })
})
