// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyTextToClipboard } from '~/utils/clipboard'

function stubClipboard(writeText?: () => Promise<void>) {
  vi.stubGlobal('navigator', { clipboard: writeText ? { writeText } : undefined })
}

// happy-dom has no `execCommand`, so it can only be stubbed by assignment.
function stubExecCommand(onCopy: () => boolean) {
  document.execCommand = vi.fn(onCopy)
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'execCommand')
})

describe('copyTextToClipboard', () => {
  it('reports success when the Clipboard API resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    expect(await copyTextToClipboard('hello')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('falls back to execCommand when the Clipboard API rejects', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')))
    stubExecCommand(() => true)

    expect(await copyTextToClipboard('hello')).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('falls back to execCommand when the Clipboard API is absent', async () => {
    stubClipboard(undefined)
    stubExecCommand(() => true)

    expect(await copyTextToClipboard('hello')).toBe(true)
  })

  it('puts the text in the textarea it copies from', async () => {
    stubClipboard(undefined)
    let copiedText: string | undefined
    stubExecCommand(() => {
      copiedText = document.querySelector('textarea')?.value
      return true
    })

    await copyTextToClipboard('hello')
    expect(copiedText).toBe('hello')
  })

  // The bug this util exists for: a refused write must not read as a success.
  it('reports failure when execCommand refuses the copy', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')))
    stubExecCommand(() => false)

    expect(await copyTextToClipboard('hello')).toBe(false)
  })

  it('reports failure when execCommand throws', async () => {
    stubClipboard(undefined)
    stubExecCommand(() => {
      throw new Error('unsupported')
    })

    expect(await copyTextToClipboard('hello')).toBe(false)
  })

  it('leaves no textarea behind after the legacy path', async () => {
    stubClipboard(undefined)
    stubExecCommand(() => true)

    await copyTextToClipboard('hello')
    expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })
})
