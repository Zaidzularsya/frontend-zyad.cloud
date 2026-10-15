import { describe, expect, it } from 'vitest'
import { isCanvasEmpty } from './canvas-empty'

interface Fake {
  attrs?: Record<string, string>
  type?: string
  content?: string
  children?: number
}
type Wrapper = Parameters<typeof isCanvasEmpty>[0]
const wrapper = (items: Fake[]): Wrapper =>
  ({
    components: () => ({
      models: items,
      forEach: (fn: (c: unknown) => void) =>
        items.forEach((i) =>
          fn({
            getAttributes: () => i.attrs ?? {},
            get: (k: string) => (k === 'type' ? i.type : i.content),
            components: () => ({ length: i.children ?? 0 }),
          }),
        ),
    }),
  }) as unknown as Wrapper

describe('isCanvasEmpty', () => {
  it('null atau tanpa child → kosong', () => {
    expect(isCanvasEmpty(null)).toBe(true)
    expect(isCanvasEmpty(wrapper([]))).toBe(true)
  })

  it('hanya sentinel tenant-nav + tenant-footer → kosong', () => {
    expect(
      isCanvasEmpty(
        wrapper([
          { attrs: { 'data-zyad-slot': 'tenant-nav' } },
          { attrs: { 'data-zyad-slot': 'tenant-footer' } },
        ]),
      ),
    ).toBe(true)
  })

  it('textnode whitespace → kosong', () => {
    expect(isCanvasEmpty(wrapper([{ type: 'textnode', content: '  \n' }]))).toBe(true)
  })

  it('satu section → tidak kosong', () => {
    expect(isCanvasEmpty(wrapper([{ type: 'default', attrs: {}, children: 2 }]))).toBe(false)
  })

  it('sentinel + section → tidak kosong', () => {
    expect(
      isCanvasEmpty(wrapper([{ attrs: { 'data-zyad-slot': 'tenant-nav' } }, { type: 'default' }])),
    ).toBe(false)
  })

  it('slot selain header/footer dihitung sebagai konten', () => {
    expect(isCanvasEmpty(wrapper([{ attrs: { 'data-zyad-slot': 'lead-form' } }]))).toBe(false)
  })

  it('textnode berisi teks → tidak kosong', () => {
    expect(isCanvasEmpty(wrapper([{ type: 'textnode', content: 'halo' }]))).toBe(false)
  })
})
