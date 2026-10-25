import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Tenant products (Part 2) against the `preview` build with a stubbed API:
 *  a. product drawer "Advanced" for a tenant owner, limit above `tenant_max` is blocked;
 *  b. public tenant checkout page (unavailable state + Google credential -> invoice redirect);
 *  c. reseller "Create invoice" on a GrapesJS page row, one-time links, no button without entitlement;
 *  d. super admin records a setoran, 422 SETTLEMENT_EXCEEDS_BALANCE shows the Indonesian error.
 *
 * No real backend or Google is contacted: every `/api/v1/**` call and the GIS script are stubbed.
 * Scenario (b) needs the build to have a Google client id; playwright.config.ts passes a dummy
 * VITE_GOOGLE_CLIENT_ID to the webServer build. Needs Chromium once: `npx playwright install chromium`.
 */

function json(route: Route, data: unknown, meta?: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
  })
}

function apiError(route: Route, status: number, code: string, message: string) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, code, message }),
  })
}

const PAGED = { page: 1, per_page: 20, total: 1, total_pages: 1 }

function summaryItem(feature_key: string, module: string) {
  return {
    feature_key,
    module,
    name: feature_key,
    state: 'unlimited',
    limit: null,
    used: null,
    remaining: null,
    reset_strategy: 'never',
    at_limit: false,
  }
}

async function stubSession(
  page: Page,
  opts: { roles: string[]; permissions: string[]; summary?: unknown[] },
) {
  await page.route('**/api/v1/**', (route) => json(route, []))
  await page.route('**/api/v1/auth/me', (route) =>
    json(route, {
      id: 'user-1',
      name: 'QA',
      email: 'qa@example.com',
      permissions: opts.permissions,
      roles: opts.roles,
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
  await page.route('**/api/v1/organization/entitlements/summary', (route) =>
    json(route, opts.summary ?? []),
  )
}

test.skip(({ isMobile }) => Boolean(isMobile), 'Desktop layout only')

test.describe('a. product drawer Advanced (tenant owner)', () => {
  test('limit above tenant_max is blocked with "Maksimum N" and nothing is saved', async ({
    page,
  }) => {
    await stubSession(page, {
      roles: ['organization_owner'],
      permissions: [
        'catalog_product.read',
        'catalog_product.create',
        'catalog_product.manage_entitlements',
      ],
      summary: [summaryItem('crm.enabled', 'crm')],
    })
    let saves = 0
    await page.route(/\/api\/v1\/app\/catalog\/products(\?|$)/, (route) => {
      if (route.request().method() === 'POST') {
        saves += 1
        return json(route, {})
      }
      return json(
        route,
        [
          {
            id: 'prod-1',
            name: 'Paket WiFi',
            unit: 'pcs',
            base_price: '100000.00',
            tax_percent: '0.00',
            currency: 'IDR',
            charge_type: 'one_time',
            billing_frequency: null,
            payment_timing: 'prepaid',
            is_active: true,
            created_at: '2026-10-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
          },
        ],
        PAGED,
      )
    })
    await page.route('**/api/v1/app/catalog/categories', (route) => json(route, []))
    await page.route('**/api/v1/app/catalog/features', (route) =>
      json(route, [
        {
          key: 'crm.max_leads',
          name: 'Maksimum lead',
          module: 'crm',
          value_type: 'integer',
          reset_strategy: 'never',
          tenant_max: 100,
        },
      ]),
    )

    await page.goto('/app/crm/products')
    await page.getByRole('button', { name: 'Tambah produk' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('input[name="name"]').fill('Paket Pro')
    await dialog.locator('input[name="base_price"]').fill('50000')

    await dialog.getByTestId('advanced-toggle').click()
    await dialog.getByRole('combobox', { name: 'Status Maksimum lead' }).selectOption('quota')
    const limit = dialog.getByRole('spinbutton', { name: 'Batas Maksimum lead' })
    await limit.fill('500')
    await limit.press('Tab')

    await expect(dialog.getByTestId('limit-error')).toHaveText('Maksimum 100')
    // The number input carries max=tenant_max, so the browser blocks the native submit as well.
    await dialog.getByRole('button', { name: 'Simpan' }).click()
    await expect(dialog.getByTestId('limit-error')).toHaveText('Maksimum 100')
    expect(saves).toBe(0)
  })

  test('without catalog_product.manage_entitlements the Advanced section is absent', async ({
    page,
  }) => {
    await stubSession(page, {
      roles: ['member'],
      permissions: ['catalog_product.read', 'catalog_product.create'],
      summary: [summaryItem('crm.enabled', 'crm')],
    })
    await page.route(/\/api\/v1\/app\/catalog\/products(\?|$)/, (route) => json(route, []))
    await page.goto('/app/crm/products')
    await page.getByRole('button', { name: 'Tambah produk' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByTestId('advanced-toggle')).toHaveCount(0)
  })
})

test.describe('b. public tenant checkout', () => {
  const catalog = {
    categories: [
      {
        id: 'cat-1',
        name: 'Internet',
        position: 0,
        listings: [
          {
            code: 'wifi-20',
            name: 'WiFi 20 Mbps',
            order: 0,
            benefits: [{ label: 'Kuota tanpa batas' }],
            variants: [
              {
                product_id: 'prod-ok',
                sku: 'WIFI20',
                charge_type: 'recurring',
                billing_frequency: 'monthly',
                payment_timing: 'prepaid',
                currency: 'IDR',
                base_price: '150000.00',
                tax_percent: '0.00',
                price_with_tax: '150000.00',
                checkout_enabled: true,
              },
              {
                product_id: 'prod-off',
                sku: 'WIFI50',
                charge_type: 'recurring',
                billing_frequency: 'monthly',
                payment_timing: 'prepaid',
                currency: 'IDR',
                base_price: '300000.00',
                tax_percent: '0.00',
                price_with_tax: '300000.00',
                checkout_enabled: false,
              },
            ],
          },
        ],
      },
    ],
  }

  async function stubCheckout(page: Page) {
    await page.route('**/api/v1/**', (route) => json(route, []))
    await page.route('**/api/v1/public/tenant-catalog', (route) => json(route, catalog))
    // Stand-in for Google Identity Services: the button click delivers a fake credential.
    await page.route('https://accounts.google.com/gsi/client', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.google = { accounts: { id: {
          initialize: function (cfg) { window.__gsi = cfg },
          renderButton: function (el) {
            var b = document.createElement('button')
            b.type = 'button'
            b.textContent = 'Continue with Google (stub)'
            b.onclick = function () { window.__gsi.callback({ credential: 'e2e-credential' }) }
            el.appendChild(b)
          },
          cancel: function () {}
        } } }`,
      }),
    )
  }

  test('unknown or checkout-disabled product shows the unavailable state', async ({ page }) => {
    await stubCheckout(page)
    for (const id of ['does-not-exist', 'prod-off']) {
      await page.goto(`/checkout/${id}`)
      await expect(page.getByTestId('checkout-unavailable')).toContainText(
        'Paket tidak ditemukan atau tidak tersedia',
      )
      await expect(page.getByTestId('google-button')).toHaveCount(0)
    }
  })

  test('happy path: Google credential -> POST tenant-checkout -> navigates to the invoice URL', async ({
    page,
  }) => {
    await stubCheckout(page)
    let body: unknown
    await page.route('**/api/v1/public/tenant-checkout', (route) => {
      body = route.request().postDataJSON()
      // Same-origin relative URL: the page navigates here, the test never leaves its origin.
      return json(route, { invoice_url: '/i/e2e-invoice-token' })
    })

    await page.goto('/checkout/prod-ok')
    await expect(page.getByRole('heading', { name: 'WiFi 20 Mbps' })).toBeVisible()
    await expect(page.getByTestId('checkout-total')).toContainText('150.000')

    await page.getByRole('button', { name: 'Continue with Google (stub)' }).click()

    await expect(page).toHaveURL(/\/i\/e2e-invoice-token$/)
    expect(body).toEqual({ google_credential: 'e2e-credential', product_id: 'prod-ok' })
  })

  test('409 SELF_SERVE_ALREADY_SUBSCRIBED shows the Indonesian message and stays on the page', async ({
    page,
  }) => {
    await stubCheckout(page)
    await page.route('**/api/v1/public/tenant-checkout', (route) =>
      apiError(route, 409, 'SELF_SERVE_ALREADY_SUBSCRIBED', 'already subscribed'),
    )
    await page.goto('/checkout/prod-ok')
    await page.getByRole('button', { name: 'Continue with Google (stub)' }).click()
    await expect(page.getByRole('alert')).toHaveText('Anda sudah berlangganan paket ini.')
    await expect(page).toHaveURL(/\/checkout\/prod-ok$/)
  })
})

test.describe('c. reseller landing page activation', () => {
  const grapesPage = {
    id: 'page-1',
    name: 'Undangan Budi',
    title: 'Undangan Budi',
    slug: 'undangan-budi',
    page_type: 'landing',
    builder: 'grapesjs',
    status: 'draft',
    visibility: 'public',
    locale: 'id-ID',
    timezone: 'Asia/Jakarta',
    is_homepage: false,
    is_template: false,
    seo: {},
    updated_at: '2026-10-20T03:00:00Z',
  }

  async function stubPages(page: Page, entitled: boolean) {
    await stubSession(page, {
      roles: ['member'],
      permissions: [],
      summary: [
        summaryItem('landing.enabled', 'landing'),
        ...(entitled ? [summaryItem('landing.page_activation', 'landing')] : []),
      ],
    })
    await page.route(/\/api\/v1\/admin\/landing-pages(\?|$)/, (route) =>
      json(route, [grapesPage], PAGED),
    )
  }

  test('entitled reseller creates an invoice and sees the one-time links', async ({ page }) => {
    await stubPages(page, true)
    let payload: Record<string, unknown> = {}
    await page.route('**/api/v1/app/landing/pages/page-1/activation-invoice', (route) => {
      payload = route.request().postDataJSON()
      return json(route, {
        activation: { id: 'act-1', invoice_due_at: '2026-10-26T03:00:00Z' },
        preview_url: 'https://tenant.example/preview/one-time-token',
        payment_url: 'https://tenant.example/i/pay-token',
      })
    })

    await page.goto('/app/landing-pages/pages')
    await page.getByRole('button', { name: 'Create invoice' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('input[name="buyer_name"]').fill('Budi Santoso')
    await dialog.locator('input[name="buyer_contact"]').fill('081234567890')
    await dialog.locator('input[name="price"]').fill('150000')
    await dialog.getByRole('button', { name: 'Buat invoice' }).click()

    await expect(dialog.getByText('Invoice berhasil dibuat.')).toBeVisible()
    await expect(dialog.locator('input[name="preview_url"]')).toHaveValue(
      'https://tenant.example/preview/one-time-token',
    )
    await expect(dialog.locator('input[name="payment_url"]')).toHaveValue(
      'https://tenant.example/i/pay-token',
    )
    expect(payload).toMatchObject({
      buyer_name: 'Budi Santoso',
      price: '150000',
      duration_value: 1,
      duration_unit: 'month',
    })
  })

  test('member without landing.page_activation does not see Create invoice', async ({ page }) => {
    await stubPages(page, false)
    await page.goto('/app/landing-pages/pages')
    await expect(page.getByText('Undangan Budi').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create invoice' })).toHaveCount(0)
  })
})

test.describe('d. super admin settlement', () => {
  async function stubSettlement(page: Page, recordStatus: 201 | 422) {
    await stubSession(page, {
      roles: ['super_admin'],
      permissions: ['settlement.manage'],
    })
    const balance = {
      organization_id: 'org-9',
      organization_name: 'Tenant Sembilan',
      paid_in: '500000.00',
      settled: '0.00',
      adjusted: '0.00',
      balance: '500000.00',
    }
    await page.route(/\/api\/v1\/platform\/settlements(\?|$)/, (route) =>
      json(route, [balance], PAGED),
    )
    await page.route(/\/api\/v1\/platform\/settlements\/org-9\/entries(\?|$)/, (route) => {
      if (route.request().method() !== 'POST') return json(route, [], { ...PAGED, total: 0 })
      return recordStatus === 201
        ? json(route, { id: 'e-1', organization_id: 'org-9', kind: 'settlement' }, undefined, 201)
        : apiError(route, 422, 'SETTLEMENT_EXCEEDS_BALANCE', 'settlement exceeds balance')
    })
  }

  test('422 SETTLEMENT_EXCEEDS_BALANCE shows the Indonesian error after confirmation', async ({
    page,
  }) => {
    await stubSettlement(page, 422)
    await page.goto('/platform/settlements')
    await page.getByTestId('open-org-9').click()

    const dialog = page.getByRole('dialog').first()
    await dialog.locator('input[name="amount"]').fill('999999')
    await dialog.getByTestId('submit-entry').click()
    await page.getByTestId('confirm-entry').click()

    await expect(page.getByText('Setoran melebihi saldo yang tersisa')).toBeVisible()
    await expect(page.getByText('settlement exceeds balance')).toHaveCount(0)
  })

  test('valid setoran is sent as a settlement entry', async ({ page }) => {
    await stubSettlement(page, 201)
    let payload: Record<string, unknown> = {}
    await page.route(/\/api\/v1\/platform\/settlements\/org-9\/entries(\?|$)/, (route) => {
      if (route.request().method() !== 'POST') return json(route, [], { ...PAGED, total: 0 })
      payload = route.request().postDataJSON()
      return json(
        route,
        { id: 'e-1', organization_id: 'org-9', kind: 'settlement' },
        undefined,
        201,
      )
    })
    await page.goto('/platform/settlements')
    await page.getByTestId('open-org-9').click()

    const dialog = page.getByRole('dialog').first()
    await dialog.locator('input[name="amount"]').fill('200000')
    await dialog.getByTestId('submit-entry').click()
    await page.getByTestId('confirm-entry').click()

    await expect(page.getByText('Setoran dicatat.')).toBeVisible()
    expect(payload).toMatchObject({ kind: 'settlement', amount: '200000.00' })
  })
})
