import { PAGE_TEMPLATE_CATEGORIES } from '@/features/landing/shared/page-template-categories'
import type {
  PageTemplateCategory,
  PageTemplateSummary,
} from '@/features/landing/shared/types/page-template.types'

export function filterTemplates(
  list: PageTemplateSummary[],
  opts: { category: PageTemplateCategory | 'all'; query: string },
): PageTemplateSummary[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((t) => {
    if (opts.category !== 'all' && t.category !== opts.category) return false
    if (!q) return true
    return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  })
}

export function visibleCategories(
  list: PageTemplateSummary[],
): { code: PageTemplateCategory; label: string }[] {
  const present = new Set(list.map((t) => t.category))
  return PAGE_TEMPLATE_CATEGORIES.filter((c) => present.has(c.code))
}

export function shouldShowTemplateBanner(i: {
  pageStatus: string | null
  canvasEmpty: boolean
  dismissed: boolean
}): boolean {
  return i.pageStatus !== 'published' && !i.canvasEmpty && !i.dismissed
}

const bannerKey = (pageId: string) => `zy:tpl-banner-dismissed:${pageId}`

// localStorage bisa melempar (mode privat, data situs diblokir): banner tetap tampil.
export function readBannerDismissed(pageId: string): boolean {
  try {
    return localStorage.getItem(bannerKey(pageId)) === '1'
  } catch {
    return false
  }
}

export function writeBannerDismissed(pageId: string): void {
  try {
    localStorage.setItem(bannerKey(pageId), '1')
  } catch {
    /* abaikan: banner hanya akan muncul lagi */
  }
}

/** Membatasi jumlah render thumbnail yang berjalan bersamaan. */
export function createRenderQueue(limit: number): { acquire(): Promise<() => void> } {
  let active = 0
  const waiting: Array<() => void> = []

  const grant = (): (() => void) => {
    active++
    let released = false
    return () => {
      if (released) return
      released = true
      active--
      const next = waiting.shift()
      if (next) next()
    }
  }

  return {
    acquire() {
      if (active < limit) return Promise.resolve(grant())
      return new Promise((resolve) => {
        waiting.push(() => resolve(grant()))
      })
    },
  }
}
