/**
 * Kanvas dianggap kosong bila semua child top-level hanya sentinel header/footer
 * tenant atau textnode whitespace. Fungsi murni supaya mudah diuji tanpa GrapesJS.
 */
interface ComponentLike {
  getAttributes(): Record<string, string>
  get(key: 'type' | 'content'): unknown
}

interface WrapperLike {
  components(): { forEach(fn: (c: ComponentLike) => void): void }
}

const CHROME_SLOTS = new Set(['tenant-nav', 'tenant-footer'])

export function isCanvasEmpty(wrapper: WrapperLike | null | undefined): boolean {
  if (!wrapper) return true
  let hasContent = false
  wrapper.components().forEach((c) => {
    if (hasContent) return
    if (CHROME_SLOTS.has(c.getAttributes()['data-zyad-slot'] ?? '')) return
    if (c.get('type') === 'textnode' && String(c.get('content') ?? '').trim() === '') return
    hasContent = true
  })
  return !hasContent
}
