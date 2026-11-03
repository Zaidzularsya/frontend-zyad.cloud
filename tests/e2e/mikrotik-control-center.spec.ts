import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Mikrotik Control Center (Gelombang 2) against the `preview` build with a stubbed API:
 *  a. owner: launch wizard in `simulation` (big numbers, CSV export request), -> `pilot`, add a pilot
 *     account, "Uji Isolir", Aktif refused with MIKROTIK_PILOT_REQUIRED, then accepted;
 *  b. owner: dashboard PAUSE -> "Pulihkan Semua" enabled and POSTs; reactivation with exemptions
 *     sends the exact payload;
 *  c. member (read only): controls disabled with the owner-only tooltip, no mutation request sent.
 *
 * No real backend is contacted: every `/api/v1/**` call is stubbed, and any call that is not
 * stubbed is recorded and fails the test. Needs Chromium once: `npx playwright install chromium`.
 */

type Json = Record<string, unknown>

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

const OWNER_ONLY = 'Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.'
const PILOT_REQUIRED_MESSAGE =
  'Selesaikan minimal satu uji pilot yang berhasil sebelum mengaktifkan isolir otomatis.'

const OWNER_PERMISSIONS = [
  'mikrotik_router.read',
  'mikrotik_task.read',
  'mikrotik_control.read',
  'mikrotik_control.update',
  'mikrotik_control.restore',
]
const MEMBER_PERMISSIONS = ['mikrotik_router.read', 'mikrotik_task.read', 'mikrotik_control.read']

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

// Session stubs plus the catch-all. Playwright runs the most recently registered matching route
// first, so the catch-all goes first and everything registered later wins over it.
async function stubSession(page: Page, permissions: string[]) {
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
      permissions,
      roles: ['organization_owner'],
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
  return { unmocked }
}

const SUMMARY = {
  target: 37,
  exempt: 5,
  blocked: 2,
  already_isolated: 0,
  paired_accounts: 120,
  safe: 83,
  grace_days: 3,
  cutoff: '2026-11-01',
}

function previewRow(id: string, name: string, over: Json = {}) {
  return {
    account_id: id,
    account_name: name,
    phone: '0812',
    status: 'will_isolate',
    overdue_days: 9,
    invoice_count: 1,
    oldest_invoice_number: 'INV-001',
    balance: '150000.00',
    router_name: 'Core-1',
    products: 'Paket 10M',
    pilot: false,
    exempted_until: null,
    ...over,
  }
}
const PREVIEW_ROWS = [previewRow('a-budi', 'Budi Santoso'), previewRow('a-siti', 'Siti Aminah')]

interface ControlServer {
  state: {
    mode: 'simulation' | 'pilot' | 'active' | 'paused'
    pilot_verified_at: string | null
    pilot: {
      account_id: string
      account_name: string
      added_at: string
      test_active: boolean
      test_until: string | null
      verified: boolean
    }[]
  }
  modeBodies: Json[]
  calls: string[]
  rejectActiveOnce: boolean
  finishTest: () => void
}

// Stateful stub of /app/mikrotik/control* shaped by the MikrotikControl* schemas in openapi.yaml.
async function stubControl(page: Page, initial: ControlServer['state']['mode']) {
  const server: ControlServer = {
    state: { mode: initial, pilot_verified_at: null, pilot: [] },
    modeBodies: [],
    calls: [],
    rejectActiveOnce: false,
    finishTest() {
      this.state.pilot_verified_at = '2026-11-03T03:00:00Z'
      this.state.pilot = this.state.pilot.map((p) => ({
        ...p,
        test_active: false,
        test_until: null,
        verified: true,
      }))
    },
  }
  const record = (route: Route) =>
    server.calls.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
  const controlDto = () => ({
    mode: server.state.mode,
    grace_days: 3,
    pilot_verified_at: server.state.pilot_verified_at,
    engine: 'on',
    effective_mode: server.state.mode,
    pilot_count: server.state.pilot.length,
    test_active_count: server.state.pilot.filter((p) => p.test_active).length,
    isolated_secrets: 0,
  })
  const base = '**/api/v1/app/mikrotik'

  await page.route(`${base}/control`, (route) => json(route, controlDto()))
  await page.route(`${base}/control/mode`, (route) => {
    record(route)
    const body = route.request().postDataJSON() as Json
    server.modeBodies.push(body)
    if (body.mode === 'active' && server.rejectActiveOnce) {
      server.rejectActiveOnce = false
      return apiError(route, 409, 'MIKROTIK_PILOT_REQUIRED', 'pilot belum terverifikasi')
    }
    server.state.mode = body.mode as ControlServer['state']['mode']
    return json(route, controlDto())
  })
  await page.route(`${base}/control/preview/summary`, (route) => json(route, SUMMARY))
  await page.route(/\/api\/v1\/app\/mikrotik\/control\/preview(\?|$)/, (route) =>
    json(route, PREVIEW_ROWS, {
      page: 1,
      per_page: 20,
      total: PREVIEW_ROWS.length,
      total_pages: 1,
    }),
  )
  await page.route(/\/api\/v1\/app\/mikrotik\/control\/preview\/export/, (route) => {
    record(route)
    return route.fulfill({
      status: 200,
      contentType: 'text/csv',
      body: 'account_id,account_name\na-budi,Budi Santoso\n',
    })
  })
  await page.route(/\/api\/v1\/app\/mikrotik\/control\/activity/, (route) =>
    json(route, [], { limit: 20, offset: 0, total: 0 }),
  )
  await page.route(`${base}/tasks/summary`, (route) =>
    json(route, { counts: {}, oldest_pending_restore_at: null }),
  )
  await page.route(/\/api\/v1\/app\/mikrotik\/tasks(\?|$)/, (route) =>
    json(route, [], { page: 1, per_page: 50, total: 0, total_pages: 1 }),
  )
  await page.route(`${base}/control/restore-all`, (route) => {
    record(route)
    return json(route, { enqueued: 4, skipped: 1, failed: 0, aborted: false })
  })
  await page.route(`${base}/control/pilot`, (route) => json(route, server.state.pilot))
  await page.route(/\/api\/v1\/app\/mikrotik\/accounts\/search/, (route) =>
    json(route, [{ id: 'a-budi', name: 'Budi Santoso', phone: '0812', email: '' }]),
  )
  await page.route(`${base}/control/pilot/a-budi`, (route) => {
    record(route)
    server.state.pilot = [
      {
        account_id: 'a-budi',
        account_name: 'Budi Santoso',
        added_at: '2026-11-03T02:00:00Z',
        test_active: false,
        test_until: null,
        verified: false,
      },
    ]
    return route.fulfill({ status: 204 })
  })
  await page.route(`${base}/control/pilot/a-budi/test`, (route) => {
    record(route)
    const until = '2026-11-03T03:10:00Z'
    server.state.pilot = server.state.pilot.map((p) => ({
      ...p,
      test_active: true,
      test_until: until,
    }))
    return json(route, { test_until: until })
  })
  return server
}

test.skip(({ isMobile }) => Boolean(isMobile), 'Desktop layout only')

test.describe('Mikrotik control center', () => {
  test('a. owner: wizard simulation -> pilot -> refused then accepted activation', async ({
    page,
  }) => {
    const { unmocked } = await stubSession(page, OWNER_PERMISSIONS)
    const server = await stubControl(page, 'simulation')

    await page.goto('/app/mikrotik/launch')

    // Simulation: big numbers and the explicit "nothing is disconnected" banner.
    await expect(page.getByText('Simulasi, tidak ada koneksi yang diputus')).toBeVisible()
    await expect(page.getByTestId('count-target')).toHaveText('37')
    await expect(page.getByTestId('count-safe')).toHaveText('83')

    // CSV export goes through the API client (blob) and triggers a browser download.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Ekspor CSV' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^kandidat-isolir-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(server.calls).toContain('GET /api/v1/app/mikrotik/control/preview/export')

    await page.getByRole('button', { name: 'Lanjut ke Pilot' }).click()
    await expect(page.getByRole('region', { name: 'Langkah Pilot' })).toBeVisible()
    expect(server.modeBodies).toEqual([{ mode: 'pilot' }])

    // Add a pilot account through the picker.
    await expect(page.getByText('Belum ada akun pilot.')).toBeVisible()
    await page.getByRole('button', { name: 'Tambah akun pilot' }).click()
    await page.getByPlaceholder('Cari nama atau nomor HP').fill('budi')
    await page.getByRole('button', { name: /Budi Santoso/ }).click()
    const pilotRow = page.getByTestId('pilot-a-budi')
    await expect(pilotRow).toBeVisible()
    expect(server.calls).toContain('PUT /api/v1/app/mikrotik/control/pilot/a-budi')

    // Before a verified test the activation button is blocked client-side: no mode request.
    const activate = page.getByRole('button', { name: 'Aktifkan Isolir Otomatis' })
    await expect(activate).toHaveAttribute('aria-disabled', 'true')
    await expect(activate).toHaveAttribute('title', PILOT_REQUIRED_MESSAGE)
    // dispatchEvent bypasses Playwright's actionability check (aria-disabled counts as disabled).
    await activate.dispatchEvent('click')
    expect(server.modeBodies).toEqual([{ mode: 'pilot' }])

    // "Uji Isolir" issues the inspect request.
    await pilotRow.getByRole('button', { name: 'Uji Isolir' }).click()
    await expect(pilotRow.getByText(/Uji berjalan/)).toBeVisible()
    expect(server.calls).toContain('POST /api/v1/app/mikrotik/control/pilot/a-budi/test')

    // The test window ends server-side; the panel's polling picks up pilot_verified_at.
    server.finishTest()
    await expect(pilotRow.getByText('Terverifikasi')).toBeVisible({ timeout: 10_000 })
    await expect(activate).not.toHaveAttribute('aria-disabled', 'true')

    // The server still refuses once (e.g. verification revoked meanwhile): verbatim message.
    server.rejectActiveOnce = true
    await activate.click()
    await expect(page.getByRole('alert').filter({ hasText: PILOT_REQUIRED_MESSAGE })).toBeVisible()
    expect(server.state.mode).toBe('pilot')

    // Second attempt succeeds.
    await activate.click()
    await expect(page.getByText('Isolir otomatis aktif.')).toBeVisible()
    expect(server.modeBodies).toEqual([{ mode: 'pilot' }, { mode: 'active' }, { mode: 'active' }])
    expect(unmocked).toEqual([])
  })

  test('b. owner: PAUSE enables "Pulihkan Semua"; reactivation sends exact exemptions', async ({
    page,
  }) => {
    const { unmocked } = await stubSession(page, OWNER_PERMISSIONS)
    const server = await stubControl(page, 'active')
    server.state.pilot_verified_at = '2026-11-02T00:00:00Z'

    await page.goto('/app/mikrotik/control')

    const toggle = page.getByRole('switch', { name: 'Isolir otomatis' })
    const restore = page.getByRole('button', { name: 'Pulihkan Semua' })
    await expect(page.getByTestId('mode-label')).toHaveText('ON')
    // Not paused yet: Pulihkan Semua is blocked and sends nothing.
    await expect(restore).toHaveAttribute('aria-disabled', 'true')
    await restore.dispatchEvent('click')
    expect(server.calls).toEqual([])

    await toggle.click()
    await expect(page.getByTestId('mode-label')).toHaveText('PAUSE')
    expect(server.modeBodies).toEqual([{ mode: 'paused' }])
    await expect(restore).not.toHaveAttribute('aria-disabled', 'true')

    await restore.click()
    const confirm = page.getByRole('dialog', { name: 'Pulihkan Semua Pelanggan?' })
    await confirm.getByRole('button', { name: 'Pulihkan Semua' }).click()
    await expect(page.getByTestId('restore-result')).toContainText('4 diproses, 1 dilewati')
    expect(server.calls.filter((c) => c.includes('restore-all'))).toEqual([
      'POST /api/v1/app/mikrotik/control/restore-all',
    ])

    // Reactivate with one exempted customer.
    await toggle.click()
    const dialog = page.getByRole('dialog', { name: 'Aktifkan Kembali Isolir Otomatis' })
    await expect(dialog.getByTestId('reactivate-summary')).toHaveText(
      '37 pelanggan akan diisolir ulang dalam 2 menit',
    )
    await dialog.getByRole('checkbox', { name: 'Pilih Budi Santoso' }).check()
    await dialog.getByLabel('Dikecualikan sampai').fill('2099-12-31')
    await dialog.getByLabel('Alasan').fill('  Janji bayar tanggal 5  ')
    await dialog
      .getByRole('button', { name: 'Aktifkan & Beri Pengecualian pada 1 Pelanggan Terpilih' })
      .click()
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('mode-label')).toHaveText('ON')
    expect(server.modeBodies).toEqual([
      { mode: 'paused' },
      {
        mode: 'active',
        exemptions: {
          account_ids: ['a-budi'],
          reason: 'Janji bayar tanggal 5',
          until: '2099-12-31',
        },
      },
    ])
    expect(unmocked).toEqual([])
  })

  test('c. member: controls disabled with the owner-only tooltip, no mutation is sent', async ({
    page,
  }) => {
    const { unmocked } = await stubSession(page, MEMBER_PERMISSIONS)
    const server = await stubControl(page, 'paused')
    const mutations: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/') && req.method() !== 'GET')
        mutations.push(`${req.method()} ${new URL(req.url()).pathname}`)
    })

    await page.goto('/app/mikrotik/control')

    const toggle = page.getByRole('switch', { name: 'Isolir otomatis' })
    const restore = page.getByRole('button', { name: 'Pulihkan Semua' })
    const graceSave = page.getByRole('button', { name: 'Simpan' })
    await expect(toggle).toBeVisible()
    for (const control of [toggle, restore, graceSave]) {
      await expect(control).toHaveAttribute('aria-disabled', 'true')
      await expect(control).toHaveAttribute('title', OWNER_ONLY)
      await control.dispatchEvent('click')
    }
    await expect(page.getByText(OWNER_ONLY, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.waitForLoadState('networkidle')
    expect(mutations).toEqual([])
    expect(server.modeBodies).toEqual([])
    expect(server.calls).toEqual([])
    expect(unmocked).toEqual([])
  })
})
