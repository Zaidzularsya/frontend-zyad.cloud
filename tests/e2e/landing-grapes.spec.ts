import { expect, test, type Route } from '@playwright/test'

/**
 * Public render path for GrapesJS-authored landing pages, against a stubbed
 * `/public/landing/resolve`. Covers what unit tests cannot: the page really
 * renders inside an <iframe srcdoc>, the sandbox has no `allow-scripts`, and a
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
  '<div data-zyad-slot="tenant-nav"><span>placeholder nav</span></div>' +
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

test('renders a grapesjs page inside a script-less iframe', async ({ page }) => {
  await page.goto('/grapes-demo')

  const frame = page.locator('iframe[title="Halaman GrapesJS"]')
  await expect(frame).toBeVisible()

  const sandbox = (await frame.getAttribute('sandbox')) ?? ''
  expect(sandbox).toContain('allow-forms')
  expect(sandbox).not.toContain('allow-scripts')

  const inner = page.frameLocator('iframe[title="Halaman GrapesJS"]')
  await expect(inner.locator('h1.hero-title')).toHaveText('Halaman GrapesJS')
  // CSS from the document blob is applied inside the frame.
  await expect(inner.locator('h1.hero-title')).toHaveCSS('color', 'rgb(10, 20, 30)')

  // The tenant-nav sentinel is filled live from the resolve payload's menu.
  const tenantLink = inner.locator('nav.zyad-tenant-nav a')
  await expect(tenantLink).toHaveText('Harga')
  await expect(tenantLink).toHaveAttribute('href', '/pricing')
  await expect(inner.locator('text=placeholder nav')).toHaveCount(0)

  // The smuggled <script> / onerror never ran in the top document.
  expect(
    await page.evaluate(() => (window as unknown as Record<string, unknown>).__pwned),
  ).toBeUndefined()

  // The shared marketing <nav> is suppressed (page owns its chrome).
  await expect(page.locator('nav')).toHaveCount(0)

  await expect(page).toHaveTitle('Halaman GrapesJS')
})
