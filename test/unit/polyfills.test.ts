import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installPolyfills } from '~/utils/polyfills'

// Stands in for an older WebView that lacks every built-in installPolyfills
// shims, restoring the native descriptors so no shim leaks into other tests.
const shimmed = [
  [Object, 'hasOwn'],
  [Array.prototype, 'at'],
  [String.prototype, 'at'],
  [Promise, 'withResolvers'],
  [Promise, 'try'],
  [Uint8Array.prototype, 'toHex'],
] as const
let natives: (PropertyDescriptor | undefined)[] = []

beforeEach(() => {
  natives = shimmed.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key))
  shimmed.forEach(([target, key]) => Reflect.deleteProperty(target, key))
})

afterEach(() => {
  shimmed.forEach(([target, key], index) => {
    Reflect.deleteProperty(target, key)
    const native = natives[index]
    if (native) Object.defineProperty(target, key, native)
  })
})

describe('installPolyfills', () => {
  it('Object.hasOwn ignores inherited properties', () => {
    installPolyfills()
    expect(Object.hasOwn({ own: 1 }, 'own')).toBe(true)
    expect(Object.hasOwn(Object.create({ inherited: 1 }), 'inherited')).toBe(false)
  })

  describe.each([
    ['Array', Array.prototype, (): { at: (index: number) => unknown } => ['a', 'b', 'c']],
    ['String', String.prototype, (): { at: (index: number) => unknown } => 'abc'],
  ] as const)('%s.prototype.at', (_, proto, make) => {
    const at = (index: number) => make().at(index)

    it('resolves positive, negative and fractional indexes', () => {
      installPolyfills()
      expect(at(0)).toBe('a')
      expect(at(-1)).toBe('c')
      expect(at(1.9)).toBe('b')
      expect(at(-1.9)).toBe('c')
      expect(at(Number.NaN)).toBe('a')
    })

    it('returns undefined out of range', () => {
      installPolyfills()
      expect(at(3)).toBeUndefined()
      expect(at(-4)).toBeUndefined()
    })

    it('does not enumerate on the prototype', () => {
      installPolyfills()
      expect(Object.keys(proto)).not.toContain('at')
    })
  })

  it('Promise.withResolvers settles the returned promise', async () => {
    installPolyfills()
    const resolved = Promise.withResolvers<number>()
    resolved.resolve(1)
    await expect(resolved.promise).resolves.toBe(1)
    const rejected = Promise.withResolvers<number>()
    rejected.reject(new Error('nope'))
    await expect(rejected.promise).rejects.toThrow('nope')
  })

  // pdf.js routes every worker message through Promise.try, so a synchronous
  // throw must surface as a rejection rather than escape the caller.
  it('Promise.try forwards arguments and turns throws into rejections', async () => {
    installPolyfills()
    await expect(Promise.try((a: number, b: number) => a + b, 1, 2)).resolves.toBe(3)
    await expect(Promise.try(async () => 'async')).resolves.toBe('async')
    await expect(Promise.try(() => {
      throw new Error('sync')
    })).rejects.toThrow('sync')
  })

  it('leaves existing implementations alone when run twice', () => {
    installPolyfills()
    const before = shimmed.map(([target, key]) => target[key])
    installPolyfills()
    expect(shimmed.map(([target, key]) => target[key])).toEqual(before)
  })
})
