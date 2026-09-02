import { afterEach, describe, expect, it, vi } from 'vitest'

import { isCanvasMessage, onCanvasMessage, postToFrame } from './bridge'

const ORIGIN = window.location.origin

function messageEvent(data: unknown, origin: string = ORIGIN): MessageEvent {
  return new MessageEvent('message', { data, origin })
}

describe('canvas bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts same-origin canvas: messages', () => {
    expect(isCanvasMessage(messageEvent({ type: 'canvas:ready' }))).toBe(true)
    expect(isCanvasMessage(messageEvent({ type: 'canvas:set-sections', sections: [] }))).toBe(true)
  })

  it('rejects foreign-origin messages', () => {
    expect(isCanvasMessage(messageEvent({ type: 'canvas:ready' }, 'https://evil.example'))).toBe(
      false,
    )
  })

  it('rejects non-canvas message shapes', () => {
    expect(isCanvasMessage(messageEvent({ type: 'vite:beforeUpdate' }))).toBe(false)
    expect(isCanvasMessage(messageEvent('hello'))).toBe(false)
    expect(isCanvasMessage(messageEvent(null))).toBe(false)
  })

  it('onCanvasMessage only forwards valid messages and unsubscribes cleanly', () => {
    const handler = vi.fn()
    const stop = onCanvasMessage(handler)

    window.dispatchEvent(messageEvent({ type: 'canvas:select', id: 'abc' }))
    window.dispatchEvent(messageEvent({ type: 'not-canvas' }))
    window.dispatchEvent(messageEvent({ type: 'canvas:ready' }, 'https://evil.example'))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ type: 'canvas:select', id: 'abc' }, expect.anything())

    stop()
    window.dispatchEvent(messageEvent({ type: 'canvas:ready' }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('postToFrame posts to the given window with the app origin', () => {
    const frame = { postMessage: vi.fn() } as unknown as Window
    postToFrame(frame, { type: 'canvas:set-selected', id: null })
    expect(frame.postMessage).toHaveBeenCalledWith(
      { type: 'canvas:set-selected', id: null },
      ORIGIN,
    )
  })

  it('postToFrame is a no-op for a null frame', () => {
    expect(() => postToFrame(null, { type: 'canvas:set-selected', id: null })).not.toThrow()
  })
})
