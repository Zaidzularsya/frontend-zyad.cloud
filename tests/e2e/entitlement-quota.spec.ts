import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Entitlement / quota UX against the `preview` build with a stubbed API:
 * quota banner + upgrade button on Leads, sidebar hiding of disabled features
 * (fail-open when the summary request fails), the "Pemakaian Paket" page and
 * the custom-domain option on the Domains page.
 *
 * Needs Chromium once: `npx playwright install chromium`.
 */

type SummaryItem = {
  feature_key: string
  module: string
  name: string
  unit?: string
  state: 'unlimited' | 'quota' | 'hidden'
  limit?: number | null
  used?: number | null
  remaining?: number | null
  reset_strategy: 'never' | 'monthly'
  at_limit: boolean
}

function json(route: Route, data: unknown, meta?: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
  })
}

function leadsQuota(used: number, limit = 50): SummaryItem {
  return {
    feature_key: 'crm.max_leads',
    module: 'crm',
    name: 'Maksimum lead',
    unit: 'lead',
    state: 'quota',
    limit,
    used,
    remaining: Math.max(0, limit - used),
    reset_strategy: 'never',
    at_limit: used >= limit,
  }
}

function unlimited(feature_key: string, module: string): SummaryItem {
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

function lead(i: number) {
  return {
    id: `lead-${i}`,
    contact_name: `Lead ${i}`,
    email: `lead${i}@example.com`,
    source: 'website',
    status: 'new',
    score: 50,
    address: {},
    created_at: '2026-09-20T02:00:00Z',
    updated_at: '2026-09-20T02:00:00Z',
  }
}

interface StubOptions {
  roles?: string[]
  permissions?: string[]
  /** Respond to the lead create POST with 409 QUOTA_EXCEEDED. */
  createLeadQuota409?: boolean
  landingPages?: unknown[]
}

const OWNER_PERMISSIONS = [
  'lead.read',
  'lead.update',
  'lead.assign',
  'activity.read',
  'activity.update',
  'whatsapp.session.read',
]

async function stubApi(page: Page, summary: SummaryItem[] | 'error', options: StubOptions = {}) {
  await page.route('**/api/v1/**', (route) => json(route, []))
  await page.route('**/api/v1/auth/me', (route) =>
    json(route, {
      id: 'user-1',
      name: 'QA',
      email: 'qa@example.com',
      permissions: options.permissions ?? OWNER_PERMISSIONS,
      roles: options.roles ?? ['super_admin'],
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
    summary === 'error'
      ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'boom' } }),
        })
      : json(route, summary),
  )
  await page.route(/\/api\/v1\/app\/crm\/leads(\?|$)/, (route) => {
    if (route.request().method() === 'POST') {
      return options.createLeadQuota409
        ? route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              code: 'QUOTA_EXCEEDED',
              message: 'billing quota has been exceeded',
            }),
          })
        : json(route, lead(99))
    }
    return json(route, [lead(1), lead(2), lead(3)], {
      page: 1,
      per_page: 20,
      total: 3,
      total_pages: 1,
    })
  })
  if (options.landingPages) {
    await page.route(/\/api\/v1\/admin\/landing-pages(\?|$)/, (route) =>
      json(route, options.landingPages, { page: 1, per_page: 20, total: 1, total_pages: 1 }),
    )
  }
}

test.skip(({ isMobile }) => Boolean(isMobile), 'Desktop layout only')

test('leads at quota limit: banner, upgrade button navigates without opening the dialog', async ({
  page,
}) => {
  await stubApi(page, [leadsQuota(50), unlimited('crm.enabled', 'crm')])
  await page.goto('/app/crm/leads?tab=all')

  await expect(
    page.getByRole('status').filter({ hasText: 'sudah penuh (50 dari 50)' }),
  ).toContainText('Kuota lead')
  await expect(page.getByText('Lead 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lead Baru' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Upgrade untuk tambah lead' }).click()
  await expect(page).toHaveURL(/\/app\/billing$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('leads with room left: no banner, normal add button', async ({ page }) => {
  await stubApi(page, [leadsQuota(10), unlimited('crm.enabled', 'crm')])
  await page.goto('/app/crm/leads?tab=all')

  await expect(page.getByText('Lead 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lead Baru' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upgrade untuk tambah lead' })).toHaveCount(0)
  await expect(page.getByText('sudah penuh')).toHaveCount(0)
})

test('sidebar hides features missing from the summary', async ({ page }) => {
  await stubApi(page, [unlimited('crm.enabled', 'crm')])
  await page.goto('/app/dashboard')

  const nav = page.getByRole('navigation').first()
  await expect(nav.getByRole('link', { name: 'Leads' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'WhatsApp' })).toHaveCount(0)
})

test('sidebar fails open when the summary request fails', async ({ page }) => {
  await stubApi(page, 'error')
  await page.goto('/app/dashboard')

  const nav = page.getByRole('navigation').first()
  await expect(nav.getByRole('link', { name: 'Leads' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'WhatsApp' })).toBeVisible()
})

test('usage page shows meters and the full quota label', async ({ page }) => {
  await stubApi(page, [
    leadsQuota(50),
    { ...leadsQuota(10), feature_key: 'crm.max_contacts', name: 'Maksimum contact' },
  ])
  await page.goto('/app/billing/usage')

  const full = page.getByTestId('usage-row-crm.max_leads')
  await expect(full).toContainText('50 / 50')
  await expect(full.getByText('penuh', { exact: true })).toBeVisible()
  await expect(full.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')

  const roomy = page.getByTestId('usage-row-crm.max_contacts')
  await expect(roomy).toContainText('10 / 50')
  await expect(roomy.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20')
  await expect(roomy.getByText('penuh', { exact: true })).toHaveCount(0)

  await expect(page.getByRole('link', { name: 'Upgrade plan' })).toBeVisible()
})

test('add-domain drawer hides the custom type when landing.custom_domain is hidden', async ({
  page,
}) => {
  await stubApi(page, [unlimited('domain.enabled', 'domain')])
  await page.goto('/app/landing-pages/domains')
  await page.getByRole('button', { name: '+ Add Domain' }).click()
  await expect(page.getByRole('heading', { name: 'Add Domain' })).toBeVisible()
  await expect(page.getByPlaceholder('toko-anda')).toBeVisible()
  await expect(
    page.locator('option[value="custom"]').filter({ hasText: 'Custom domain' }),
  ).toHaveCount(0)
})

test('add-domain drawer offers the custom type when landing.custom_domain is unlimited', async ({
  page,
}) => {
  await stubApi(page, [
    unlimited('domain.enabled', 'domain'),
    unlimited('landing.custom_domain', 'landing'),
  ])
  await page.goto('/app/landing-pages/domains')
  await page.getByRole('button', { name: '+ Add Domain' }).click()
  await expect(page.getByRole('heading', { name: 'Add Domain' })).toBeVisible()
  await expect(page.locator('option[value="custom"]')).toHaveCount(2) // filter + drawer
})

test('usage page never renders "null" for rows without a usage counter', async ({ page }) => {
  await stubApi(page, [
    leadsQuota(10),
    {
      feature_key: 'landing.max_sections_per_page',
      module: 'landing',
      name: 'Bagian per page',
      unit: 'bagian',
      state: 'quota',
      limit: 12,
      used: null,
      remaining: null,
      reset_strategy: 'never',
      at_limit: false,
    },
    unlimited('crm.enabled', 'crm'),
  ])
  await page.goto('/app/billing/usage')

  await expect(page.getByTestId('usage-row-landing.max_sections_per_page')).toContainText(
    'batas 12',
  )
  await expect(page.getByTestId('usage-row-crm.max_leads')).toContainText('10 / 50')
  await expect(page.locator('body')).not.toContainText('null')
})

test('non-owner member (no feature.read permission) still sees the banner and upgrade CTA', async ({
  page,
}) => {
  await stubApi(page, [leadsQuota(50), unlimited('crm.enabled', 'crm')], {
    roles: ['member'],
    permissions: ['lead.read', 'lead.create', 'activity.read'],
  })
  await page.goto('/app/crm/leads?tab=all')

  await expect(
    page.getByRole('status').filter({ hasText: 'sudah penuh (50 dari 50)' }),
  ).toContainText('Kuota lead')
  await expect(page.getByRole('button', { name: 'Upgrade untuk tambah lead' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lead Baru' })).toHaveCount(0)
})

test('409 QUOTA_EXCEEDED on lead submit shows the Indonesian message and refetches the summary', async ({
  page,
}) => {
  let summaryRequests = 0
  await stubApi(page, [leadsQuota(10), unlimited('crm.enabled', 'crm')], {
    createLeadQuota409: true,
  })
  page.on('request', (req) => {
    if (req.url().includes('/organization/entitlements/summary')) summaryRequests += 1
  })
  await page.goto('/app/crm/leads?tab=all')
  await page.getByRole('button', { name: 'Lead Baru' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.locator('input').first().fill('Budi Santoso')
  const before = summaryRequests
  await dialog.locator('form').evaluate((f) => (f as HTMLFormElement).requestSubmit())

  await expect(
    page.getByText('Kuota lead paket Anda sudah penuh. Upgrade plan untuk menambah lead baru.'),
  ).toBeVisible()
  await expect(page.getByText('billing quota has been exceeded')).toHaveCount(0)
  await expect.poll(() => summaryRequests).toBeGreaterThan(before)
})

test('landing pages at limit: banner, Create Page becomes the upgrade CTA, Duplicate disabled', async ({
  page,
}) => {
  await stubApi(
    page,
    [
      {
        feature_key: 'landing.max_pages',
        module: 'landing',
        name: 'Maks. page',
        state: 'quota',
        limit: 3,
        used: 3,
        remaining: 0,
        reset_strategy: 'never',
        at_limit: true,
      },
      unlimited('landing.enabled', 'landing'),
    ],
    {
      landingPages: [
        {
          id: 'p1',
          name: 'Public Marketing',
          title: 'Public Marketing',
          slug: 'public-marketing',
          page_type: 'landing',
          status: 'draft',
          visibility: 'public',
          locale: 'id-ID',
          timezone: 'Asia/Jakarta',
          is_homepage: false,
          is_template: false,
          seo: {},
          updated_at: '2026-10-07T03:00:00Z',
        },
      ],
    },
  )
  await page.goto('/app/landing-pages/pages')

  await expect(page.getByRole('status').filter({ hasText: 'Kuota landing page' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Page' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Upgrade untuk tambah page' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Duplicate/ }).first()).toBeDisabled()
})
