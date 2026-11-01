import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Mikrotik tenant UI (Gelombang 1) against the `preview` build with a stubbed API:
 *  a. onboarding checklist: 5 steps, step 1 active while no router exists;
 *  b. routers: add router, Setup preview -> Terapkan sends plan_hash -> router becomes "Siap";
 *  c. PPPoE accounts: analyze, footer count follows ticked rows, partial-failure pair-bulk result;
 *  d. catalog product "Memicu isolir" dialog with preview numbers, PUT {enabled:true};
 *  e. member without mikrotik_task.retry sees "Coba Lagi" disabled with the owner-only tooltip.
 *
 * No real backend is contacted: every `/api/v1/**` call is stubbed (the backend is not deployed).
 * Needs Chromium once: `npx playwright install chromium`.
 */

function json(route: Route, data: unknown, meta?: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
  })
}

const paged = (total: number) => ({ page: 1, per_page: 20, total, total_pages: 1 })

const OWNER_PERMISSIONS = [
  'mikrotik_router.read',
  'mikrotik_router.create',
  'mikrotik_router.update',
  'mikrotik_router.delete',
  'mikrotik_router.setup',
  'mikrotik_secret.read',
  'mikrotik_secret.import',
  'mikrotik_secret.pair',
  'mikrotik_secret.unpair',
  'mikrotik_task.read',
  'mikrotik_task.retry',
  'mikrotik_product_trigger.read',
  'mikrotik_product_trigger.update',
  'catalog_product.read',
]

const MIKROTIK_ENABLED = {
  feature_key: 'mikrotik.enabled',
  module: 'mikrotik',
  name: 'Jaringan',
  state: 'unlimited',
  limit: null,
  used: null,
  remaining: null,
  reset_strategy: 'never',
  at_limit: false,
}

async function stubSession(page: Page, opts: { roles: string[]; permissions: string[] }) {
  const unmocked: string[] = []
  await page.route('**/api/v1/**', (route) => {
    unmocked.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
    return json(route, [])
  })
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
    json(route, [MIKROTIK_ENABLED]),
  )
  return unmocked
}

// Backend binds plan_hash with len=64.
const PLAN_HASH = 'a1b2c3d4'.repeat(8)

const ONBOARDING = {
  router_registered: false,
  router_ready: false,
  secrets_total: 0,
  secrets_paired: 0,
  secrets_needs_profile: 0,
  products_marked: 0,
  sender_configured: false,
  complete: false,
}

function routerRow(over: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    name: 'Core-1',
    host: '10.0.0.1',
    port: 8728,
    api_type: 'binary',
    use_tls: false,
    username: 'zyad',
    has_password: true,
    isolir_ready: false,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...over,
  }
}

test.skip(({ isMobile }) => Boolean(isMobile), 'Desktop layout only')

test.describe('Mikrotik onboarding', () => {
  test('a. checklist shows 5 steps with step 1 active when no router exists', async ({ page }) => {
    const unmocked = await stubSession(page, {
      roles: ['organization_owner'],
      permissions: OWNER_PERMISSIONS,
    })
    await page.route('**/api/v1/app/mikrotik/onboarding', (route) => json(route, ONBOARDING))
    await page.route(/\/api\/v1\/app\/mikrotik\/routers(\?|$)/, (route) =>
      json(route, [], paged(0)),
    )
    await page.route('**/api/v1/app/mikrotik/tasks/summary', (route) =>
      json(route, { counts: {}, oldest_pending_restore_at: null }),
    )
    await page.route(/\/api\/v1\/app\/mikrotik\/tasks(\?|$)/, (route) => json(route, [], paged(0)))

    await page.goto('/app/mikrotik')

    const steps = page.locator('li[data-step]')
    await expect(steps).toHaveCount(5)
    await expect(page.locator('li[data-step="router"]')).toHaveAttribute('data-active', 'true')
    for (const key of ['setup', 'secrets', 'products', 'sender']) {
      await expect(page.locator(`li[data-step="${key}"]`)).toHaveAttribute('data-active', 'false')
    }
    await expect(page.getByText('Belum ada router terdaftar.')).toBeVisible()
    expect(unmocked).toEqual([])
  })

  test('b. add a router, preview the setup plan and apply it with plan_hash', async ({ page }) => {
    const unmocked = await stubSession(page, {
      roles: ['organization_owner'],
      permissions: OWNER_PERMISSIONS,
    })
    let routers: ReturnType<typeof routerRow>[] = []
    let createBody: Record<string, unknown> | null = null
    let previewCalls = 0
    let previewBody = null as Record<string, unknown> | null
    let applyBody: Record<string, unknown> | null = null

    await page.route(/\/api\/v1\/app\/mikrotik\/routers(\?|$)/, async (route) => {
      if (route.request().method() === 'POST') {
        createBody = route.request().postDataJSON()
        const created = routerRow()
        routers = [created]
        return json(route, created, undefined, 201)
      }
      return json(route, routers, paged(routers.length))
    })
    await page.route('**/api/v1/app/mikrotik/secrets?**', (route) => json(route, [], paged(0)))
    await page.route('**/api/v1/app/mikrotik/routers/r1/setup/preview', (route) => {
      previewCalls += 1
      previewBody = route.request().postDataJSON()
      return json(route, {
        hash: PLAN_HASH,
        actions: [
          {
            kind: 'create',
            path: '/ppp/profile',
            match: { name: 'zyad-isolir' },
            attrs: { 'local-address': '10.255.254.1' },
            note: 'profil isolir',
          },
          {
            kind: 'exists',
            path: '/ip/firewall/nat',
            match: { comment: 'zyad:redirect' },
            attrs: {},
            optional: true,
          },
        ],
      })
    })
    await page.route('**/api/v1/app/mikrotik/routers/r1/setup/apply', (route) => {
      applyBody = route.request().postDataJSON()
      routers = [routerRow({ isolir_ready: true })]
      return json(route, routers[0])
    })

    await page.goto('/app/mikrotik/routers')
    await expect(page.getByText('Belum ada router terdaftar.')).toBeVisible()

    await page.getByRole('button', { name: 'Tambah Router' }).click()
    const form = page.getByRole('dialog', { name: 'Tambah router' })
    await form.locator('input[name="name"]').fill('Core-1')
    await form.locator('input[name="host"]').fill('10.0.0.1')
    await form.locator('input[name="username"]').fill('zyad')
    await form.locator('input[name="password"]').fill('secret-pw')
    await form.getByRole('button', { name: 'Simpan' }).click()

    await expect(form).toBeHidden()
    const row = page.locator('tr[data-router="r1"]')
    await expect(row).toBeVisible()
    await expect(row.getByText('Belum siap')).toBeVisible()
    expect(createBody).toMatchObject({
      name: 'Core-1',
      host: '10.0.0.1',
      port: 8728,
      username: 'zyad',
      password: 'secret-pw',
      use_tls: false,
    })

    await row.getByRole('button', { name: 'Setup isolir' }).click()
    const setup = page.getByRole('dialog', { name: 'Setup isolir: Core-1' })
    await expect(setup.getByTestId('plan-actions').locator('li')).toHaveCount(2)
    await expect(setup.getByText('Objek ini akan dibuat di router.')).toBeVisible()
    await expect(setup.getByText('profil isolir')).toBeVisible()
    expect(previewCalls).toBe(1)
    expect(previewBody).toEqual({})

    await setup.getByRole('button', { name: 'Terapkan' }).click()
    await expect(
      page.locator('tr[data-router="r1"]').getByText('Siap', { exact: true }),
    ).toBeVisible()
    // Apply must carry the same setup inputs as the preview, plus the plan hash.
    expect(applyBody).toEqual({ ...previewBody, plan_hash: PLAN_HASH })
    expect(unmocked).toEqual([])
  })

  test('c. accounts: footer count follows ticked rows, pair-bulk partial failure', async ({
    page,
  }) => {
    const unmocked = await stubSession(page, {
      roles: ['organization_owner'],
      permissions: OWNER_PERMISSIONS,
    })
    await page.route(/\/api\/v1\/app\/mikrotik\/routers(\?|$)/, (route) =>
      json(route, [routerRow({ isolir_ready: true })], paged(1)),
    )

    const suggestion = (id: string, name: string, basis: string) => ({
      account_id: id,
      account_name: name,
      account_phone: '0812',
      basis,
      candidates: 1,
    })
    type Suggestion = ReturnType<typeof suggestion>
    const secretRow = (id: string, name: string, over: Record<string, unknown> = {}) => ({
      id,
      router_id: 'r1',
      name,
      profile: '10M',
      original_profile: '10M',
      needs_original_profile: false,
      disabled: false,
      present: true,
      isolation_state: 'normal',
      account_id: null,
      account_name: '',
      paired_at: null,
      last_seen_at: null,
      comment: '',
      suggestion: null as Suggestion | null,
      ...over,
    })
    const secrets = [
      secretRow('s-budi', 'budi', { suggestion: suggestion('a-budi', 'Budi Santoso', 'phone') }),
      secretRow('s-siti', 'siti', { suggestion: suggestion('a-siti', 'Siti Aminah', 'name') }),
      secretRow('s-rina', 'rina', { suggestion: suggestion('a-rina', 'Rina Wati', 'name') }),
      secretRow('s-andi', 'andi', {
        suggestion: {
          account_id: '',
          account_name: '',
          account_phone: '',
          basis: 'ambiguous',
          candidates: 2,
        },
      }),
      secretRow('s-joko', 'joko', { needs_original_profile: true }),
    ]
    const paired = new Set<string>()
    let analyzeCalls = 0
    let pairCalls = 0
    let pairBody: { items: { secret_id: string; account_id: string }[] } | null = null

    await page.route('**/api/v1/app/mikrotik/secrets?**', (route) => {
      const q = new URL(route.request().url()).searchParams
      const wantPaired = q.get('paired') === 'true'
      const filtered = secrets.filter((s) => {
        if (paired.has(s.id) !== wantPaired) return false
        if (q.get('suggestion') === 'suggested')
          return s.suggestion !== null && s.suggestion.basis !== 'ambiguous'
        if (q.get('suggestion') === 'needs_decision') return s.suggestion?.basis === 'ambiguous'
        if (q.get('needs_original_profile') === 'true') return s.needs_original_profile
        return true
      })
      const perPage = Number(q.get('per_page') ?? 20)
      const data = filtered
        .slice(0, perPage)
        .map((s) =>
          paired.has(s.id)
            ? { ...s, account_id: 'x', account_name: 'Terpasang', suggestion: null }
            : s,
        )
      return json(route, data, paged(filtered.length))
    })
    await page.route('**/api/v1/app/mikrotik/routers/r1/secrets/analyze', (route) => {
      analyzeCalls += 1
      return json(route, { total: 5, suggested: 3, needs_decision: 1 })
    })
    await page.route('**/api/v1/app/mikrotik/secrets/pair-bulk', (route) => {
      pairCalls += 1
      pairBody = route.request().postDataJSON()
      const results = pairBody!.items.map((item) =>
        item.secret_id === 's-siti'
          ? {
              secret_id: item.secret_id,
              ok: false,
              code: 'MIKROTIK_ACCOUNT_NOT_FOUND',
              message: 'customer account not found',
            }
          : { secret_id: item.secret_id, ok: true, code: '', message: '' },
      )
      for (const r of results) if (r.ok) paired.add(r.secret_id)
      return json(route, { results })
    })

    await page.goto('/app/mikrotik/accounts')

    // Three green suggestions are pre-ticked; ambiguous and needs-profile rows cannot be ticked.
    await expect(page.getByRole('button', { name: 'Konfirmasi 3 Pasangan' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Pilih budi' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Pilih andi' })).toBeDisabled()
    await expect(page.getByRole('checkbox', { name: 'Pilih joko' })).toBeDisabled()
    await expect(page.getByTestId('summary')).toContainText('3 diusulkan')
    await expect(page.getByTestId('summary')).toContainText('1 butuh keputusan')

    await page.getByRole('button', { name: 'Analisis ulang' }).click()
    await expect(page.getByText('Analisis selesai: 3 diusulkan, 1 butuh keputusan.')).toBeVisible()
    expect(analyzeCalls).toBe(1)
    // Nothing is paired before the explicit confirmation.
    expect(pairCalls).toBe(0)

    const rina = page.getByRole('checkbox', { name: 'Pilih rina' })
    await rina.uncheck()
    await expect(page.getByRole('button', { name: 'Konfirmasi 2 Pasangan' })).toBeVisible()
    await expect(page.getByText('2 dari 5 baris dipilih')).toBeVisible()
    expect(pairCalls).toBe(0)

    // Ticking the row again restores the count; then untick for the real confirmation.
    await rina.check()
    await expect(page.getByRole('button', { name: 'Konfirmasi 3 Pasangan' })).toBeVisible()
    await rina.uncheck()
    await expect(page.getByRole('button', { name: 'Konfirmasi 2 Pasangan' })).toBeVisible()
    expect(pairCalls).toBe(0)
    expect(pairBody).toBeNull()

    await page.getByRole('button', { name: 'Konfirmasi 2 Pasangan' }).click()

    const result = page.getByRole('dialog', { name: 'Hasil Pairing' })
    await expect(result.getByText('1 Pasangan Berhasil')).toBeVisible()
    await expect(result.getByText('1 Pasangan Gagal')).toBeVisible()
    await expect(result.getByText('Pelanggan tidak ditemukan atau sudah dihapus.')).toBeVisible()
    expect(pairCalls).toBe(1)
    expect(pairBody).toEqual({
      items: [
        { secret_id: 's-budi', account_id: 'a-budi' },
        { secret_id: 's-siti', account_id: 'a-siti' },
      ],
    })

    // The text button, not the icon button in the modal header (also labelled "Tutup").
    await result.locator('button:not([aria-label])', { hasText: 'Tutup' }).click()
    await expect(result).toBeHidden()
    await expect(page.getByRole('row', { name: /budi/ })).toHaveCount(0)
    const siti = page.getByRole('row', { name: /siti/ })
    await expect(siti).toBeVisible()
    await expect(
      siti.getByText('Gagal: Pelanggan tidak ditemukan atau sudah dihapus.'),
    ).toBeVisible()
    expect(unmocked).toEqual([])
  })

  test('d. product "Memicu isolir" dialog shows impact and sends enabled:true', async ({
    page,
  }) => {
    const unmocked = await stubSession(page, {
      roles: ['organization_owner'],
      permissions: OWNER_PERMISSIONS,
    })
    let enabled = false
    let putBody: unknown = null

    await page.route(/\/api\/v1\/app\/catalog\/products(\?|$)/, (route) =>
      json(
        route,
        [
          {
            id: 'prod-1',
            name: 'Paket PPPoE 10M',
            sku: 'PPPOE-10',
            unit: 'bulan',
            base_price: '150000.00',
            tax_percent: '0.00',
            currency: 'IDR',
            charge_type: 'recurring',
            billing_frequency: 'monthly',
            payment_timing: 'prepaid',
            is_active: true,
            created_at: '2026-10-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
          },
        ],
        paged(1),
      ),
    )
    await page.route('**/api/v1/app/catalog/categories', (route) => json(route, []))
    await page.route('**/api/v1/app/mikrotik/products/unmarked', (route) =>
      json(
        route,
        enabled
          ? []
          : [
              {
                id: 'prod-1',
                name: 'Paket PPPoE 10M',
                sku: 'PPPOE-10',
                recurring: true,
                active: true,
              },
            ],
      ),
    )
    await page.route('**/api/v1/app/mikrotik/products/triggers', (route) =>
      json(
        route,
        enabled
          ? [
              {
                product_id: 'prod-1',
                product_name: 'Paket PPPoE 10M',
                product_sku: 'PPPOE-10',
                enabled: true,
                effective_from: '2026-11-02',
              },
            ]
          : [],
      ),
    )
    await page.route('**/api/v1/app/mikrotik/products/prod-1/trigger/preview', (route) =>
      json(route, {
        product: {
          id: 'prod-1',
          name: 'Paket PPPoE 10M',
          sku: 'PPPOE-10',
          recurring: true,
          active: true,
        },
        active_contracts: 12,
        accounts: 11,
        overdue_invoices: 4,
        effective_from: '2026-11-02',
        already_enabled: false,
      }),
    )
    await page.route('**/api/v1/app/mikrotik/products/prod-1/trigger', (route) => {
      putBody = route.request().postDataJSON()
      enabled = true
      return json(route, { product_id: 'prod-1', enabled: true, effective_from: '2026-11-02' })
    })

    await page.goto('/app/crm/products')
    await expect(
      page.getByText('1 produk recurring dipakai contract aktif belum ditandai.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Memicu isolir Paket PPPoE 10M' }).click()
    const dialog = page.getByRole('dialog', { name: 'Memicu isolir: Paket PPPoE 10M' })
    await expect(dialog).toBeVisible()
    const figure = (label: string) =>
      dialog.getByRole('listitem').filter({ hasText: label }).locator('strong')
    await expect(figure('contract aktif')).toHaveText('12')
    await expect(figure('pelanggan')).toHaveText('11')
    await expect(figure('invoice overdue')).toHaveText('4')

    await dialog.getByRole('button', { name: 'Aktifkan' }).click()
    await expect(dialog).toBeHidden()
    expect(putBody).toEqual({ enabled: true })
    await expect(page.getByTestId('isolir-badge')).toBeVisible()
    expect(unmocked).toEqual([])
  })

  // Same role in both cases: only the permission list differs, so the button state is
  // attributable to mikrotik_task.retry alone.
  async function openTasksPage(page: Page, permissions: string[]) {
    const unmocked = await stubSession(page, { roles: ['organization_owner'], permissions })
    const retryRequests: string[] = []
    await page.route(/\/api\/v1\/app\/mikrotik\/tasks(\?|$)/, (route) =>
      json(
        route,
        [
          {
            id: 't1',
            action: 'isolate',
            status: 'failed',
            priority: 0,
            attempts: 3,
            next_attempt_at: '2026-11-01T01:00:00Z',
            last_error_code: '',
            last_error: '',
            router: { id: 'r1', name: 'Core-1' },
            secret: { id: 's1', name: 'budi' },
            account: { id: 'a1', name: 'Budi Santoso' },
            created_at: '2026-11-01T00:00:00Z',
            finished_at: null,
          },
        ],
        paged(1),
      ),
    )
    await page.route(/\/api\/v1\/app\/mikrotik\/routers(\?|$)/, (route) =>
      json(route, [routerRow({ isolir_ready: true })], paged(1)),
    )
    await page.route('**/api/v1/app/mikrotik/tasks/summary', (route) =>
      json(route, { counts: { failed: 1 }, oldest_pending_restore_at: null }),
    )
    await page.route('**/api/v1/app/mikrotik/tasks/t1/retry', (route) => {
      retryRequests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
      return json(route, { id: 't1', status: 'pending' })
    })
    await page.goto('/app/mikrotik/tasks')
    return { unmocked, retryRequests }
  }

  test('e1. owner (mikrotik_task.retry) can retry a failed task', async ({ page }) => {
    const { unmocked, retryRequests } = await openTasksPage(page, [
      'mikrotik_task.read',
      'mikrotik_task.retry',
    ])

    const retry = page.getByRole('button', { name: 'Coba Lagi' })
    await expect(retry).toBeEnabled()
    await retry.click()
    await expect(page.getByText('Tugas dijadwalkan ulang.')).toBeVisible()
    expect(retryRequests).toEqual(['POST /api/v1/app/mikrotik/tasks/t1/retry'])
    expect(unmocked).toEqual([])
  })

  test('e2. same role without mikrotik_task.retry: disabled with owner-only title', async ({
    page,
  }) => {
    const { unmocked, retryRequests } = await openTasksPage(page, ['mikrotik_task.read'])

    const retry = page.getByRole('button', { name: 'Coba Lagi' })
    await expect(retry).toBeVisible()
    await expect(retry).toBeDisabled()
    // The native title attribute is asserted; the hover-rendered tooltip itself is not.
    await expect(retry).toHaveAttribute(
      'title',
      'Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.',
    )
    // dispatchEvent bypasses Playwright's actionability check; a disabled button must not fire.
    await retry.dispatchEvent('click')
    // The tasks list was already loaded, so a stray POST would have been issued by now; also
    // wait for the page to be idle before the negative check.
    await page.waitForLoadState('networkidle')
    expect(retryRequests).toEqual([])
    expect(unmocked).toEqual([])
  })
})
