import { expect, test, type Route } from '@playwright/test'

/**
 * Drives the visual landing-page builder end to end against a stubbed API, so it
 * runs against the plain `preview` build with no backend. It covers the browser
 * concerns the unit/component tests cannot: the 3-pane shell renders, the canvas
 * iframe route loads, a palette click inserts a block, and Publish issues a
 * `PUT /sections` followed by `POST /publish`.
 *
 * Needs Chromium once: `npx playwright install chromium`.
 */

const PAGE_ID = '11111111-1111-1111-1111-111111111111'

const landingPage = {
  id: PAGE_ID,
  name: 'Promo',
  title: 'Promo',
  slug: 'promo',
  page_type: 'campaign',
  status: 'draft',
  visibility: 'public',
  is_template: false,
  is_homepage: false,
  locale: 'id-ID',
  timezone: 'Asia/Jakarta',
  settings: {},
  seo: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  })
}

test.beforeEach(async ({ page }) => {
  // Catch-all first; specific routes registered after win (reverse match order).
  await page.route('**/api/v1/**', (route) => json(route, []))

  await page.route('**/api/v1/auth/me', (route) =>
    json(route, {
      id: 'user-1',
      name: 'QA',
      email: 'qa@example.com',
      permissions: ['landing.page.read', 'landing.section.manage', 'landing.page.publish'],
      roles: ['super_admin'],
    }),
  )
  await page.route('**/api/v1/users/me/organizations', (route) =>
    json(route, [
      {
        is_current: true,
        organization: { id: 'org-1', name: 'Org', slug: 'org', type: 'customer', status: 'active' },
      },
    ]),
  )

  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}/sections`, (route) => {
    if (route.request().method() === 'GET') return json(route, [])
    // PUT bulk replace — echo with server ids.
    const body = route.request().postDataJSON() as { sections: Record<string, unknown>[] }
    return json(
      route,
      body.sections.map((s, i) => ({
        ...s,
        id: `srv-${i + 1}`,
        sort_order: (i + 1) * 10,
        created_at: '',
        updated_at: '',
      })),
    )
  })
  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}/sections/autosave`, (route) =>
    json(route, []),
  )
  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}/publish`, (route) => json(route, {}))
  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}`, (route) => json(route, landingPage))
  await page.route(/\/api\/v1\/admin\/landing-pages(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [landingPage], meta: { total: 1 } }),
    }),
  )
})

test('inserts a block and publishes through the builder', async ({ page }) => {
  await page.goto('/app/landing-pages/content')

  // 3-pane shell
  await expect(page.getByText('Struktur halaman', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible()

  // Canvas iframe mounted
  await expect(page.locator('iframe[title="Canvas landing page"]')).toBeVisible()

  // Palette → click the Hero block → it appears in the page outline
  await page.locator('button[data-block-id="hero.default"]').click()
  await expect(page.locator('li[data-section-id]').filter({ hasText: 'Hero' })).toBeVisible()

  // Publish flushes a PUT /sections then POSTs /publish
  const putSections = page.waitForRequest(
    (r) => r.method() === 'PUT' && r.url().includes(`/landing-pages/${PAGE_ID}/sections`),
  )
  const publish = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().includes(`/landing-pages/${PAGE_ID}/publish`),
  )
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await putSections
  await publish
})

test('adds an atomic element block and exposes the appearance panel', async ({ page }) => {
  await page.goto('/app/landing-pages/content')

  await expect(page.locator('iframe[title="Canvas landing page"]')).toBeVisible()

  // "Komponen" palette group is present with the Headline element block.
  await expect(page.getByText('Komponen', { exact: true })).toBeVisible()
  await page.locator('button[data-block-id="element.headline"]').click()

  // It lands in the page outline and selects itself, opening the property panel.
  await expect(page.locator('li[data-section-id]').filter({ hasText: 'Headline' })).toBeVisible()
  await expect(page.getByText('Appearance', { exact: true })).toBeVisible()

  // The APPEARANCE accordion carries a typography control for element blocks.
  await page.getByText('Appearance', { exact: true }).click()
  await expect(page.getByText('Ukuran font (px)')).toBeVisible()
})
