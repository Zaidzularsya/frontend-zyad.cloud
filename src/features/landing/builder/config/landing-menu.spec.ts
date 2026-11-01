import { describe, expect, it } from 'vitest'
import { buildLandingManagementMenuItems, buildLandingManagementRoutes } from './landing-menu'

describe('Galeri Template (menu khusus platform)', () => {
  it('tidak muncul di menu workspace', () => {
    const labels = buildLandingManagementMenuItems('landing-pages').map((i) => i.label)
    expect(labels).not.toContain('Galeri Template')
  })

  it('muncul di menu platform dengan permission manage', () => {
    const item = buildLandingManagementMenuItems('platform-landing-pages').find(
      (i) => i.label === 'Galeri Template',
    )
    expect(item?.permission).toBe('landing.page_template.manage')
    expect(item?.route).toBe('platform-landing-pages-page-templates')
  })

  it('route hanya didaftarkan untuk prefix platform', () => {
    const names = (prefix: string) => buildLandingManagementRoutes(prefix).map((r) => r.name)
    expect(names('platform-landing-pages')).toContain('platform-landing-pages-page-templates')
    expect(names('landing-pages')).not.toContain('landing-pages-page-templates')
  })

  it('route platform dilindungi permission manage', () => {
    const route = buildLandingManagementRoutes('platform-landing-pages').find(
      (r) => r.name === 'platform-landing-pages-page-templates',
    )
    expect(route?.meta?.permissions).toEqual(['landing.page_template.manage'])
  })
})

describe('Invoice Halaman (menu khusus workspace reseller)', () => {
  it('muncul di menu workspace dengan permission update halaman', () => {
    const item = buildLandingManagementMenuItems('landing-pages').find(
      (i) => i.label === 'Invoice Halaman',
    )
    expect(item?.route).toBe('landing-pages-invoices')
    expect(item?.permission).toBe('landing.page.update')
  })

  it('tidak muncul di menu platform', () => {
    const labels = buildLandingManagementMenuItems('platform-landing-pages').map((i) => i.label)
    expect(labels).not.toContain('Invoice Halaman')
  })

  it('route hanya didaftarkan untuk workspace dan dilindungi permission', () => {
    const routes = (prefix: string) => buildLandingManagementRoutes(prefix)
    expect(routes('platform-landing-pages').map((r) => r.name)).not.toContain(
      'platform-landing-pages-invoices',
    )
    const route = routes('landing-pages').find((r) => r.name === 'landing-pages-invoices')
    expect(route?.path).toBe('landing-pages/invoices')
    expect(route?.meta?.permissions).toEqual(['landing.page.update'])
  })
})
