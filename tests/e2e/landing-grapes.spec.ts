import { expect, test, type Route } from '@playwright/test'

/**
 * Public render path for GrapesJS-authored landing pages, against a stubbed
 * `/public/landing/resolve`. Covers what unit tests cannot: the page really
 * renders inside an open shadow root (default renderer), and a
 * <script> smuggled into the stored HTML never executes in the top document.
 *
 * Needs Chromium once: `npx playwright install chromium`.
 */

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  })
}

const GRAPES_HTML =
  `<div data-zyad-slot="tenant-nav" data-zyad-header='{"sticky":true,"variant":"solid","align":"left","showAction":true,"actionLabel":"Masuk","actionUrl":"/login"}'><span>placeholder nav</span></div>` +
  '<main><h1 class="hero-title">Halaman GrapesJS</h1><p>Konten publik.</p>' +
  '<script>window.__pwned = true</script>' +
  '<img src="x" onerror="window.__pwned = true"></main>'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', (route) => json(route, []))

  await page.route('**/api/v1/public/landing/resolve*', (route) =>
    json(route, {
      Builder: 'grapesjs',
      HTML: GRAPES_HTML,
      CSS: '.hero-title{color:rgb(10,20,30)}',
      Page: {
        id: 'p1',
        title: 'Halaman GrapesJS',
        slug: 'grapes-demo',
        seo: { meta_title: 'Halaman GrapesJS', meta_description: 'Deskripsi demo.' },
      },
      Menus: [
        {
          location: 'header',
          is_active: true,
          items: [
            {
              label: 'Harga',
              link_type: 'internal_page',
              destination: 'pricing',
              sort_order: 1,
              is_enabled: true,
            },
          ],
        },
      ],
      Branding: { company_name: 'Demo Co' },
    }),
  )
})

test('renders a grapesjs page inside a sanitized shadow root', async ({ page }) => {
  await page.goto('/grapes-demo')

  // Default renderer is Shadow DOM (VITE_LANDING_RENDERER=shadow); Playwright CSS
  // locators pierce open shadow roots, so `host` scopes the page content.
  const host = page.locator('.zy-page-host')
  await expect(host).toBeVisible()
  await expect(host).toHaveAttribute('role', 'document')
  await expect(host).toHaveAttribute('aria-label', 'Halaman GrapesJS')
  await expect(page.locator('iframe')).toHaveCount(0)

  const inner = host
  await expect(inner.locator('h1.hero-title')).toHaveText('Halaman GrapesJS')
  // CSS from the document blob is applied inside the shadow root.
  await expect(inner.locator('h1.hero-title')).toHaveCSS('color', 'rgb(10, 20, 30)')

  // Shadow renderer keeps the [data-zyad-slot] sentinel in the page and teleports
  // the live header component into it; the static placeholder markup is replaced.
  await expect(inner.locator('[data-zyad-slot="tenant-nav"]')).toHaveCount(1)
  await expect(inner.locator('text=placeholder nav')).toHaveCount(0)

  // The header is filled live from the resolve payload: brand + nav + action.
  await expect(page.locator('.zyad-tenant-header__brand')).toContainText('Demo Co')
  const tenantLink = page.locator('nav.zyad-tenant-header__nav a')
  await expect(tenantLink).toHaveText('Harga')
  await expect(tenantLink).toHaveAttribute('href', '/pricing')
  await expect(page.locator('.zyad-tenant-header__action')).toHaveText('Masuk')

  // The smuggled <script> / onerror never ran in the top document.
  expect(
    await page.evaluate(() => (window as unknown as Record<string, unknown>).__pwned),
  ).toBeUndefined()

  // The shared marketing <nav> is suppressed (page owns its chrome) — the
  // tenant header's own <nav class="zyad-tenant-header__nav"> is expected.
  await expect(page.locator('nav:not(.zyad-tenant-header__nav)')).toHaveCount(0)

  await expect(page).toHaveTitle('Halaman GrapesJS')
})
