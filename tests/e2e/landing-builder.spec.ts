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

// The visual builder is a desktop-only surface (3-pane grid, iframe canvas).
test.skip(({ isMobile }) => Boolean(isMobile), 'Builder is desktop-only')

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

  // Tenant-wide chrome: header menu + brand.
  await page.route('**/api/v1/admin/landing/branding', (route) =>
    json(route, { company_name: 'Org', colors: { primary: '#2563eb' }, social_links: [] }),
  )
  await page.route('**/api/v1/admin/landing/menus/*/items', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      return json(route, { ...body, id: 'item-1', children: [] })
    }
    return json(route, [])
  })
  await page.route('**/api/v1/admin/landing/menus', (route) => {
    if (route.request().method() === 'POST') {
      return json(route, { id: 'menu-1', name: 'Header Menu', location: 'header', is_active: true })
    }
    return json(route, [])
  })

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

  // 3-pane shell + collapsible palette groups
  await expect(page.getByText('Section', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible()
  await expect(page.locator('iframe[title="Canvas landing page"]')).toBeVisible()

  // Open the collapsed "Section" group, click the Hero block → it renders on the canvas
  await page.getByText('Section', { exact: true }).click()
  await page.locator('button[data-block-id="hero.default"]').click()
  const canvas = page.frameLocator('iframe[title="Canvas landing page"]')
  await expect(canvas.locator('[data-section-id]')).toHaveCount(1)

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

  // "Teks" palette group is open by default and carries the Headline block.
  await expect(page.getByText('Teks', { exact: true })).toBeVisible()
  await page.locator('button[data-block-id="element.headline"]').click()

  // It renders on the canvas and selects itself, opening the property panel.
  const canvas = page.frameLocator('iframe[title="Canvas landing page"]')
  await expect(canvas.locator('[data-section-id]')).toHaveCount(1)
  const propertyPanel = page.locator('aside').filter({ hasText: 'Properti section' })
  await expect(propertyPanel.locator('input').first()).toHaveValue('Headline')

  // The APPEARANCE accordion carries a typography control for element blocks.
  await propertyPanel.locator('summary').filter({ hasText: 'Appearance' }).click()
  await expect(page.getByText('Ukuran font (px)')).toBeVisible()
})

test('drags a palette block onto the canvas preview', async ({ page }) => {
  await page.goto('/app/landing-pages/content')
  await expect(page.locator('iframe[title="Canvas landing page"]')).toBeVisible()
  await page.waitForTimeout(500)

  const tile = page.locator('button[data-block-id="element.paragraph"]')
  const tb = (await tile.boundingBox())!
  const ifr = (await page.locator('iframe[title="Canvas landing page"]').boundingBox())!

  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2)
  await page.mouse.down()
  await page.mouse.move(tb.x + tb.width / 2 + 12, tb.y + 12, { steps: 3 })
  await page.mouse.move(ifr.x + ifr.width / 2, ifr.y + 60, { steps: 10 })
  await page.mouse.up()

  const canvas = page.frameLocator('iframe[title="Canvas landing page"]')
  await expect(canvas.locator('[data-section-id]')).toHaveCount(1)
})

test('adds a Header section and edits the tenant-wide menu', async ({ page }) => {
  await page.goto('/app/landing-pages/content')
  await expect(page.locator('iframe[title="Canvas landing page"]')).toBeVisible()

  // Header is a real block in the "Navigasi" palette group.
  await page.getByText('Navigasi', { exact: true }).click()
  await page.locator('button[data-block-id="header.default"]').click()

  // It lands on the canvas as a real section, auto-selected → Header panel opens.
  const canvas = page.frameLocator('iframe[title="Canvas landing page"]')
  await expect(canvas.locator('.header-section')).toBeVisible()
  const propertyPanel = page.locator('aside').filter({ hasText: 'Brand & Logo' })
  await expect(propertyPanel.getByText('Navigation', { exact: true })).toBeVisible()

  // The Navigation area is open by default; reveal the add-item form, then add an
  // item → POST creates the header menu + the item.
  await propertyPanel.getByRole('button', { name: 'Tambah item' }).click()
  const createMenu = page.waitForRequest(
    (r) => r.method() === 'POST' && /\/admin\/landing\/menus$/.test(r.url()),
  )
  const createItem = page.waitForRequest(
    (r) => r.method() === 'POST' && /\/admin\/landing\/menus\/[^/]+\/items$/.test(r.url()),
  )
  await propertyPanel.getByPlaceholder('Pricing').fill('Pricing')
  await propertyPanel.getByRole('button', { name: 'Tambah', exact: true }).click()
  await createMenu
  await createItem
})
