import { expect, test, type Route } from '@playwright/test'

/**
 * Leads page: "Ringkasan" dashboard tab + "Semua Lead" table tab, against the
 * `preview` build with a stubbed API. Covers what unit tests cannot: the
 * ApexCharts chart mounts, status cards deep-link into the filtered table,
 * sort/pagination reach the API, and bulk "Assign owner" calls the assign
 * endpoint per selected lead.
 *
 * Needs Chromium once: `npx playwright install chromium`.
 */

function json(route: Route, data: unknown, meta?: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
  })
}

const dashboard = {
  range: {
    from: '2026-08-30',
    to: '2026-09-28',
    previous_from: '2026-07-31',
    previous_to: '2026-08-29',
    granularity: 'day',
  },
  status_counts: { new: 86, contacted: 64, qualified: 41, unqualified: 23, converted: 98 },
  status_entered: {
    new: { current: 30, previous: 20 },
    contacted: { current: 12, previous: 15 },
    qualified: { current: 8, previous: 0 },
    unqualified: { current: 2, previous: 1 },
    converted: { current: 9, previous: 9 },
  },
  created: { current: 30, previous: 20 },
  converted: { current: 9, previous: 9 },
  series: Array.from({ length: 30 }, (_, i) => {
    const day = new Date(Date.UTC(2026, 7, 30 + i))
    return {
      bucket: day.toISOString().slice(0, 10),
      created: (i % 4) + 1,
      converted: i % 3 === 0 ? 1 : 0,
    }
  }),
  by_source: [
    { source: 'website', count: 14 },
    { source: 'whatsapp', count: 9 },
    { source: '', count: 7 },
  ],
  follow_up_summary: { pending: 3, overdue: 1, due_today: 1, due_next_7_days: 1 },
  upcoming_follow_ups: [
    {
      id: 'act-1',
      related_entity_type: 'lead',
      related_entity_id: 'lead-1',
      type: 'call',
      subject: 'Konfirmasi kebutuhan 20 user',
      due_at: '2026-09-25T02:00:00Z',
      status: 'pending',
      created_at: '2026-09-20T02:00:00Z',
      updated_at: '2026-09-20T02:00:00Z',
      lead_name: 'Andi Wijaya',
      company_name: 'PT Sinar Logistik',
      assignee_name: 'Rizky Saputra',
    },
  ],
  recent_activity: [
    {
      kind: 'status_changed',
      occurred_at: '2026-09-28T02:00:00Z',
      lead_id: 'lead-2',
      lead_name: 'Maya Kusuma',
      actor_name: 'Dian Anggraini',
      from_value: 'contacted',
      to_value: 'qualified',
    },
  ],
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

test.skip(({ isMobile }) => Boolean(isMobile), 'Desktop layout only')

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', (route) => json(route, []))
  await page.route('**/api/v1/auth/me', (route) =>
    json(route, {
      id: 'user-1',
      name: 'QA',
      email: 'qa@example.com',
      permissions: ['lead.read', 'lead.update', 'lead.assign', 'activity.read', 'activity.update'],
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
  await page.route('**/api/v1/app/crm/members', (route) =>
    json(route, [{ user_id: 'user-2', name: 'Rizky Saputra', email: 'rizky@example.com' }]),
  )
  await page.route('**/api/v1/app/crm/leads/dashboard**', (route) => json(route, dashboard))
  await page.route(/\/api\/v1\/app\/crm\/leads(\?|$)/, (route) => {
    const url = new URL(route.request().url())
    const pageNo = Number(url.searchParams.get('page') ?? 1)
    const perPage = Number(url.searchParams.get('per_page') ?? 20)
    const total = 45
    const start = (pageNo - 1) * perPage
    const rows = Array.from({ length: Math.max(0, Math.min(perPage, total - start)) }, (_, i) =>
      lead(start + i + 1),
    )
    return json(route, rows, {
      page: pageNo,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    })
  })
})

test('overview renders cards, chart, follow-ups and activity feed', async ({ page }) => {
  await page.goto('/app/crm/leads')

  await expect(page.getByRole('tab', { name: 'Ringkasan' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const qualifiedCard = page.getByRole('button', { name: 'Lihat lead berstatus Qualified' })
  await expect(qualifiedCard).toContainText('41')
  await expect(qualifiedCard).toContainText('baru')
  await expect(page.getByRole('button', { name: 'Lihat lead berstatus Baru' })).toContainText(
    '+50%',
  )

  // ApexCharts mounted with both series.
  await expect(page.locator('.apexcharts-canvas')).toBeVisible()
  await expect(page.locator('.apexcharts-series')).toHaveCount(2)

  await expect(page.getByText('Terlambat', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Andi Wijaya' })).toBeVisible()
  await expect(page.getByText('Dian Anggraini memindahkan Maya Kusuma ke Qualified')).toBeVisible()
  await expect(page.getByText('Tanpa sumber')).toBeVisible()

  // Changing the range re-queries with a 7-day window.
  const request = page.waitForRequest((r) => {
    if (!r.url().includes('/leads/dashboard')) return false
    const url = new URL(r.url())
    const from = new Date(`${url.searchParams.get('from')}T00:00:00Z`).getTime()
    const to = new Date(`${url.searchParams.get('to')}T00:00:00Z`).getTime()
    return (to - from) / 86_400_000 === 6
  })
  await page.getByRole('button', { name: '7 hari' }).click()
  await request
})

test('status card opens the filtered table; sort, paging and bulk assign hit the API', async ({
  page,
}) => {
  await page.goto('/app/crm/leads')

  const filtered = page.waitForRequest(
    (r) => /\/app\/crm\/leads\?/.test(r.url()) && r.url().includes('status=qualified'),
  )
  await page.getByRole('button', { name: 'Lihat lead berstatus Qualified' }).click()
  await filtered
  await expect(page).toHaveURL(/tab=all/)
  await expect(page.getByRole('button', { name: 'Qualified', pressed: true })).toBeVisible()

  await expect(page.getByText('Menampilkan 1–20 dari 45 lead')).toBeVisible()

  const sorted = page.waitForRequest((r) => r.url().includes('sort=-score'))
  await page.getByRole('button', { name: 'Score' }).click()
  await sorted

  const paged = page.waitForRequest(
    (r) => /\/app\/crm\/leads\?/.test(r.url()) && r.url().includes('page=3'),
  )
  await page.getByRole('button', { name: '3', exact: true }).click()
  await paged
  await expect(page.getByText('Menampilkan 41–45 dari 45 lead')).toBeVisible()
  await expect(page).toHaveURL(/page=3/)

  await page.getByRole('checkbox', { name: 'Pilih Lead 41' }).check()
  await page.getByRole('checkbox', { name: 'Pilih Lead 42' }).check()
  await expect(page.getByText('2 lead dipilih')).toBeVisible()

  const assigned: string[] = []
  await page.route('**/api/v1/app/crm/leads/*/assign', (route) => {
    assigned.push(route.request().url())
    return json(route, lead(41))
  })
  await page.getByRole('button', { name: 'Assign owner' }).click()
  await page.getByRole('combobox').last().selectOption('user-2')
  await page.getByRole('button', { name: 'Assign', exact: true }).click()
  await expect(page.getByText('2 lead di-assign ke Rizky Saputra.')).toBeVisible()
  expect(assigned).toHaveLength(2)
})
