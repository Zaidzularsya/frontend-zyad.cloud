import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const getDocument = vi.fn()
const saveDocument = vi.fn()
const publishPage = vi.fn()

vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getDocument: (...a: unknown[]) => getDocument(...a),
    saveDocument: (...a: unknown[]) => saveDocument(...a),
    publishPage: (...a: unknown[]) => publishPage(...a),
  },
}))

import { useLandingDocumentStore } from './landingDocument'

describe('useLandingDocumentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    setActivePinia(createPinia())
    getDocument.mockResolvedValue({
      data: {
        landing_page_id: 'p1',
        project: { pages: [{ name: 'Home' }] },
        html: '<body><h1>Hi</h1></body>',
        css: 'h1{color:red}',
        updated_at: '2026-09-10T08:00:00Z',
      },
    })
    saveDocument.mockResolvedValue({ data: { updated_at: '2026-09-10T09:00:00Z' } })
    publishPage.mockResolvedValue({ data: {} })
  })

  it('load() hydrates project/html/css and clears dirty', async () => {
    const store = useLandingDocumentStore()
    await store.load('p1')
    expect(getDocument).toHaveBeenCalledWith('p1')
    expect(store.pageId).toBe('p1')
    expect(store.html).toContain('<h1>Hi</h1>')
    expect(store.css).toBe('h1{color:red}')
    expect(store.dirty).toBe(false)
    expect(store.lastSavedAt).toBe('2026-09-10T08:00:00Z')
  })

  it('load() surfaces the API message on failure', async () => {
    getDocument.mockRejectedValueOnce({ response: { data: { message: 'boom' } } })
    const store = useLandingDocumentStore()
    await store.load('p1')
    expect(store.loadError).toBe('boom')
  })

  it('applyEditorSnapshot() marks dirty and debounces a save', async () => {
    vi.useFakeTimers()
    const store = useLandingDocumentStore()
    store.pageId = 'p1'
    store.applyEditorSnapshot({ project: { pages: [] }, html: '<body>x</body>', css: '' })
    expect(store.dirty).toBe(true)
    expect(saveDocument).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1600)
    expect(saveDocument).toHaveBeenCalledTimes(1)
    expect(saveDocument).toHaveBeenCalledWith('p1', {
      project: { pages: [] },
      html: '<body>x</body>',
      css: '',
    })
  })

  it('save() is a no-op when nothing is dirty', async () => {
    const store = useLandingDocumentStore()
    store.pageId = 'p1'
    await store.save()
    expect(saveDocument).not.toHaveBeenCalled()
  })

  it('save() clears dirty and records lastSavedAt', async () => {
    const store = useLandingDocumentStore()
    store.pageId = 'p1'
    store.applyEditorSnapshot({ project: {}, html: '<body>y</body>', css: '' })
    await store.save()
    expect(store.dirty).toBe(false)
    expect(store.lastSavedAt).toBe('2026-09-10T09:00:00Z')
  })

  it('publish() flushes a pending save first, then publishes', async () => {
    const store = useLandingDocumentStore()
    store.pageId = 'p1'
    store.applyEditorSnapshot({ project: {}, html: '<body>z</body>', css: '' })
    await store.publish()
    expect(saveDocument).toHaveBeenCalledTimes(1)
    expect(publishPage).toHaveBeenCalledWith('p1')
    expect(saveDocument.mock.invocationCallOrder[0]).toBeLessThan(
      publishPage.mock.invocationCallOrder[0]!,
    )
  })
})
