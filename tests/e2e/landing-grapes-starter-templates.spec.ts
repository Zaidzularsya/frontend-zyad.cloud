import { expect, test, type Route } from '@playwright/test'

/**
 * Every GRAPES_STARTERS entry, applied for real in the builder canvas.
 * Covers what unit tests (starter-templates.spec.ts, string assertions only)
 * cannot: the markup actually lays out without horizontal overflow, on both
 * the default desktop canvas and the Mobile device preset, and applying it
 * doesn't throw in the browser.
 *
 * Needs Chromium once: `npx playwright install chromium`.
 */

const PAGE_ID = '11111111-1111-1111-1111-111111111111'

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  })
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', (route) => json(route, []))
  await page.route('**/api/v1/auth/me', (route) =>
    json(route, {
      id: 'u1',
      name: 'QA',
      email: 'qa@example.com',
      permissions: [],
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
  await page.route(/\/api\/v1\/admin\/landing-pages(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{ id: PAGE_ID, name: 'Promo', title: 'Promo', slug: 'promo', builder: 'grapesjs' }],
        meta: { total: 1 },
      }),
    }),
  )
  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}`, (route) =>
    json(route, { id: PAGE_ID, name: 'Promo', title: 'Promo', slug: 'promo', builder: 'grapesjs' }),
  )
  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}/document`, (route) =>
    json(route, { landing_page_id: PAGE_ID, project: {}, html: '', css: '', updated_at: '' }),
  )
})

const templates = [
  'Kosong',
  'SaaS landing',
  'Company profile',
  'Pricing',
  'Portfolio / personal brand',
  'Event / webinar',
]

for (const label of templates) {
  test(`starter "${label}" renders without overflow or console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/app/landing-pages/content')
    await page.waitForTimeout(1200)
    await page.getByText(label, { exact: true }).click()
    await page.waitForTimeout(600)

    const frame = page.frameLocator('.gjs-frame')
    const overflowInfo = await frame.locator('body').evaluate((body) => ({
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
    }))
    expect(overflowInfo.scrollWidth).toBeLessThanOrEqual(overflowInfo.clientWidth + 2)
    expect(errors, `console/page errors: ${errors.join('; ')}`).toEqual([])
  })

  test(`starter "${label}" holds up on the Mobile device preset (375px)`, async ({ page }) => {
    await page.goto('/app/landing-pages/content')
    await page.waitForTimeout(1200)
    await page.getByText(label, { exact: true }).click()
    await page.waitForTimeout(600)

    // Switch the canvas itself to the Mobile device (GRAPES_DEVICES: 375px):
    // resizing the browser window does nothing to the iframe's emulated
    // device width, which is a separate GrapesJS control.
    await page.locator('.grapes-dev-btn').nth(2).click()
    await page.waitForTimeout(300)

    const frame = page.frameLocator('.gjs-frame')
    const overflowInfo = await frame.locator('body').evaluate((body) => ({
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
    }))
    expect(overflowInfo.scrollWidth).toBeLessThanOrEqual(overflowInfo.clientWidth + 2)
  })
}
