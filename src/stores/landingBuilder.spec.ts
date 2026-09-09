import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const getPage = vi.fn()
const getSections = vi.fn()
const bulkReplaceSections = vi.fn()
const autosaveSections = vi.fn()
const publishPage = vi.fn()

vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getPage: (...args: unknown[]) => getPage(...args),
    getSections: (...args: unknown[]) => getSections(...args),
    bulkReplaceSections: (...args: unknown[]) => bulkReplaceSections(...args),
    autosaveSections: (...args: unknown[]) => autosaveSections(...args),
    publishPage: (...args: unknown[]) => publishPage(...args),
  },
}))

import { useLandingBuilderStore } from './landingBuilder'

function serverSection(over: Record<string, unknown> = {}) {
  return {
    id: 'srv-1',
    key: 'hero-1',
    type: 'hero',
    name: 'Hero',
    sort_order: 10,
    is_enabled: true,
    content: {},
    style: {},
    created_at: '',
    updated_at: '',
    ...over,
  }
}

describe('useLandingBuilderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useRealTimers()
    getPage.mockResolvedValue({ data: { id: 'p1', slug: 'promo' } })
    getSections.mockResolvedValue({ data: [] })
    bulkReplaceSections.mockImplementation((_id, payload) => ({
      data: (payload as { sections: Record<string, unknown>[] }).sections.map((s, i) => ({
        ...serverSection(),
        id: `srv-${i + 1}`,
        key: s.key,
        type: s.type,
        name: s.name,
        content: s.content ?? {},
        style: s.style ?? {},
        sort_order: (i + 1) * 10,
      })),
    }))
    autosaveSections.mockImplementation((...a) => bulkReplaceSections(...a))
  })

  it('load() seeds sections and clears dirty/history', async () => {
    getSections.mockResolvedValue({ data: [serverSection()] })
    const store = useLandingBuilderStore()
    await store.load('p1')
    expect(store.sections).toHaveLength(1)
    expect(store.dirty).toBe(false)
    expect(store.canUndo).toBe(false)
  })

  it('insertBlock() appends, selects, reindexes sort_order and marks dirty', async () => {
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('hero.default', 0)
    store.insertBlock('cta.default', 1)
    expect(store.sections.map((s) => s.type)).toEqual(['hero', 'cta'])
    expect(store.sections.map((s) => s.sort_order)).toEqual([10, 20])
    expect(store.selectedId).toBe(store.sections[1]!.id)
    expect(store.dirty).toBe(true)
  })

  it('insertBlock() of an atomic element seeds content type + element.* variant/style', async () => {
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('element.headline', 0)
    const inserted = store.sections[0]!
    expect(inserted.type).toBe('content')
    expect(inserted.variant).toBe('element.headline')
    expect((inserted.style as Record<string, unknown>).variant).toBe('element.headline')
    expect((inserted.content as Record<string, unknown>).text).toBeDefined()
  })

  it('patchSection() merges style.typography and the payload serializes it', async () => {
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('element.headline', 0)
    const id = store.sections[0]!.id
    const style = store.sections[0]!.style as Record<string, unknown>
    store.patchSection(id, { style: { ...style, typography: { size: 44, weight: '700' } } })
    await store.save()
    const payload = bulkReplaceSections.mock.calls[0]![1] as {
      sections: { style: Record<string, unknown> }[]
    }
    expect(payload.sections[0]!.style.typography).toEqual({ size: 44, weight: '700' })
  })

  it('reorder() and removeBlock() keep sort_order contiguous', async () => {
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('hero.default', 0)
    store.insertBlock('cta.default', 1)
    store.insertBlock('faq.default', 2)
    const [a, b, c] = store.sections.map((s) => s.id) as [string, string, string]
    store.reorder([c, a, b])
    expect(store.sections.map((s) => s.id)).toEqual([c, a, b])
    store.removeBlock(a)
    expect(store.sections.map((s) => s.id)).toEqual([c, b])
    expect(store.sections.map((s) => s.sort_order)).toEqual([10, 20])
  })

  it('undo() / redo() walk the history', async () => {
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('hero.default', 0)
    store.insertBlock('cta.default', 1)
    store.undo()
    expect(store.sections.map((s) => s.type)).toEqual(['hero'])
    store.undo()
    expect(store.sections).toHaveLength(0)
    store.redo()
    expect(store.sections.map((s) => s.type)).toEqual(['hero'])
  })

  it('debounced autosave fires after the idle delay and adopts server ids', async () => {
    vi.useFakeTimers()
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('hero.default', 0)
    expect(store.sections[0]!.id).toMatch(/^tmp_/)

    await vi.advanceTimersByTimeAsync(2000)

    expect(autosaveSections).toHaveBeenCalledTimes(1)
    expect(store.sections[0]!.id).toBe('srv-1')
    expect(store.dirty).toBe(false)
    vi.useRealTimers()
  })

  it('save() sends the full section list and is a no-op when clean', async () => {
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('hero.default', 0)
    await store.save()
    expect(bulkReplaceSections).toHaveBeenCalledTimes(1)
    const payload = bulkReplaceSections.mock.calls[0]![1] as { sections: { id: string }[] }
    expect(payload.sections[0]!.id).toBe('')
    expect(store.dirty).toBe(false)

    await store.save()
    expect(bulkReplaceSections).toHaveBeenCalledTimes(1)
  })

  it('publish() flushes then calls publishPage', async () => {
    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('hero.default', 0)
    await store.publish()
    expect(bulkReplaceSections).toHaveBeenCalledTimes(1)
    expect(publishPage).toHaveBeenCalledWith('p1')
  })

  it('re-saves once when another save is requested while one is in flight', async () => {
    let release: (v: unknown) => void = () => {}
    bulkReplaceSections.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)))

    const store = useLandingBuilderStore()
    await store.load('p1')
    store.insertBlock('hero.default', 0)

    const first = store.save()
    // a second save request lands while the first is still pending
    store.insertBlock('cta.default', 1)
    void store.save()
    expect(bulkReplaceSections).toHaveBeenCalledTimes(1)

    release({ data: [] })
    await first
    await Promise.resolve()
    await Promise.resolve()

    expect(bulkReplaceSections).toHaveBeenCalledTimes(2)
  })
})
