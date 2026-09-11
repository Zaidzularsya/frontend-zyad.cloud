import { expect, test, type Route } from '@playwright/test'

/**
 * The GrapesJS builder's "Header tenant" / "Footer tenant" blocks, against a
 * stubbed API. Covers what unit tests (mocked GrapesJS) cannot: real drag
 * from the palette, real delete, and — the core of Phase 9 — that a style
 * applied via GrapesJS's own Style Manager (not our custom "Konten" panel)
 * actually survives export and publish instead of being discarded.
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

let lastPutHtml = ''
let lastPutCss = ''

test.beforeEach(async ({ page }) => {
  lastPutHtml = ''
  lastPutCss = ''
  await page.route('**/api/v1/**', (route) => json(route, []))
  await page.route('**/api/v1/auth/me', (route) =>
    json(route, {
      id: 'u1',
      name: 'QA',
      email: 'qa@example.com',
      permissions: ['landing.page.read', 'landing.page.publish'],
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
  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}/document`, (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as { html: string; css: string }
      lastPutHtml = body.html
      lastPutCss = body.css
      return json(route, { ...body, updated_at: new Date().toISOString() })
    }
    return json(route, { landing_page_id: PAGE_ID, project: {}, html: '', css: '', updated_at: '' })
  })
  await page.route(`**/api/v1/admin/landing-pages/${PAGE_ID}/publish`, (route) => json(route, {}))
})

// GrapesJS blocks use native HTML5 drag/drop across the canvas iframe
// boundary — simulate it with raw mouse events rather than `.dragTo()`.
async function dragBlockToTop(page: import('@playwright/test').Page, label: string) {
  const block = page.locator('.gjs-block').filter({ hasText: label })
  const srcBox = (await block.first().boundingBox())!
  const canvasBody = page.frameLocator('.gjs-frame').locator('body')
  const dstBox = (await canvasBody.boundingBox())!
  await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(dstBox.x + dstBox.width / 2, dstBox.y + 8, { steps: 10 })
  await page.mouse.move(dstBox.x + dstBox.width / 2, dstBox.y + 2, { steps: 10 })
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(400)
}

test('drag in a header, delete it, publish — no sentinel left in the saved document', async ({
  page,
}) => {
  await page.goto('/app/landing-pages/content')
  await page.waitForTimeout(1500)
  await page.getByText('Lewati, mulai dari kanvas kosong').click()
  await page.waitForTimeout(300)

  await dragBlockToTop(page, 'Header tenant')

  const sentinel = page.frameLocator('.gjs-frame').locator('[data-zyad-slot="tenant-nav"]')
  await expect(sentinel).toHaveCount(1)

  await sentinel.click()
  await page.waitForTimeout(150)
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(150)
  await expect(sentinel).toHaveCount(0)

  // Past the autosave debounce (600ms onChange + 1500ms store debounce).
  // lastPutHtml reflects whatever PUT last landed, whenever it fired, so no
  // need to race a waitForRequest against an autosave from the delete above.
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await page.waitForTimeout(1000)

  expect(lastPutHtml).not.toContain('tenant-nav')
})

test('a custom background/opacity/position set via the Style tab survives publish', async ({
  page,
}) => {
  await page.goto('/app/landing-pages/content')
  await page.waitForTimeout(1500)
  // A starter with an actual hero section, so the header is dropped on top
  // of real content instead of an empty canvas.
  await page.getByText('SaaS landing').click()
  await page.waitForTimeout(300)

  await dragBlockToTop(page, 'Header tenant')

  const sentinel = page.frameLocator('.gjs-frame').locator('[data-zyad-slot="tenant-nav"]')
  await expect(sentinel).toHaveCount(1)
  await sentinel.click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Style', exact: true }).click()
  await page.waitForTimeout(200)

  // Posisi sector → position: fixed (pins the header over the hero below it).
  await page.getByText('Posisi', { exact: true }).click()
  await page.waitForTimeout(150)
  await page.locator('.gjs-sm-property__position label[for*="fixed"]').click()
  await page.waitForTimeout(150)

  // Dekorasi sector → opacity (a semi-transparent header).
  await page.getByText('Dekorasi', { exact: true }).click()
  await page.waitForTimeout(150)
  await page.locator('.gjs-sm-property__opacity input[type="text"]').fill('0.6')
  await page.locator('.gjs-sm-property__opacity input[type="text"]').press('Tab')
  await page.waitForTimeout(300)

  await page.waitForTimeout(2500) // past the autosave debounce
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await page.waitForTimeout(1000)

  // The sentinel keeps its GrapesJS-assigned id/class (previously discarded on
  // export), and the corresponding rule in the saved CSS carries the style.
  expect(lastPutHtml).toContain('data-zyad-slot="tenant-nav"')
  expect(lastPutHtml).toMatch(/id="[^"]+"/)
  expect(lastPutCss).toMatch(/position:\s*fixed/)
  expect(lastPutCss).toMatch(/opacity:\s*0\.6/)
})
