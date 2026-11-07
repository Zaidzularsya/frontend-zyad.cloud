import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Halaman isolir publik (`/isolir`) dan blok tahap pemulihan di `/i/:token`,
 * dijalankan terhadap build `preview` dengan API ter-stub (tidak ada backend nyata):
 *  a. cari "budi" -> banner isolir + 2 tagihan; Bayar -> `/i/:token`; kembali `?paid=1` ->
 *     blok tahap bergerak received -> restoring -> active;
 *  b. info `enabled:false` -> halaman netral tanpa nama tenant;
 *  c. lookup found=false -> pesan seragam + blok bantuan;
 *  d. tahap needs_help menampilkan tautan tel:/mailto:/wa.me;
 *  e. halaman tetap tampil saat semua origin lain (font) di-abort atau tidak menjawab.
 */

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  })
}

const TENANT = { name: 'Rumah Net Contoh', phone: '0812-3456-7890', email: 'cs@rumahnet.test' }
const TOKEN = 'tok-budi-1'

const INVOICE = {
  tenant_name: TENANT.name,
  invoice_number: 'INV-2026-0001',
  status: 'paid',
  state: 'paid',
  issue_date: '2026-10-01',
  due_date: '2026-10-10',
  currency: 'IDR',
  grand_total: '150000',
  amount_paid: '150000',
  balance: '0',
  can_pay: false,
  items: [
    {
      description: 'Internet 20 Mbps',
      quantity: '1',
      unit_price: '150000',
      line_total: '150000',
    },
  ],
}

async function stubInfo(page: Page, enabled: boolean) {
  await page.route('**/api/v1/public/isolir/info', (route) =>
    json(route, enabled ? { enabled: true, tenant: TENANT } : { enabled: false }),
  )
}

async function stubInvoicePage(page: Page, stages: Array<Record<string, unknown>>) {
  let call = 0
  await page.route(`**/api/v1/public/invoices/${TOKEN}`, (route) => json(route, INVOICE))
  await page.route(`**/api/v1/public/invoices/${TOKEN}/status`, (route) =>
    json(route, { status: 'paid' }),
  )
  await page.route(`**/api/v1/public/invoices/${TOKEN}/provisioning`, (route) => {
    const body = stages[Math.min(call, stages.length - 1)]
    call += 1
    return json(route, body)
  })
}

test('cari tagihan, bayar, lalu tahap pemulihan received -> restoring -> active', async ({
  page,
}) => {
  await stubInfo(page, true)
  await page.route('**/api/v1/public/isolir/lookup', (route) => {
    expect(route.request().postDataJSON()).toEqual({ query: 'budi' })
    return json(route, {
      found: true,
      masked_name: 'B*** S***',
      isolated: true,
      invoices: [
        {
          number: 'INV-2026-0001',
          due_date: '2026-10-10',
          balance: '150000',
          pay_url: `http://127.0.0.1:4173/i/${TOKEN}`,
        },
        {
          number: 'INV-2026-0002',
          due_date: '2026-11-10',
          balance: '150000',
          pay_url: `http://127.0.0.1:4173/i/${TOKEN}`,
        },
      ],
    })
  })
  await stubInvoicePage(page, [
    { applicable: true, stage: 'received' },
    { applicable: true, stage: 'restoring' },
    { applicable: true, stage: 'active' },
  ])
  // Jam palsu supaya interval polling 5 detik tidak membuat tes menunggu sungguhan.
  await page.clock.install()

  await page.goto('/isolir')
  await expect(page.getByText(TENANT.name)).toBeVisible()
  await page.getByLabel('Username PPPoE atau nomor WhatsApp').fill('budi')
  await page.getByRole('button', { name: 'Cek tagihan' }).click()

  await expect(
    page.getByText('Internet Anda dijeda sementara karena ada tagihan yang belum dibayar.'),
  ).toBeVisible()
  await expect(page.getByText('INV-2026-0001')).toBeVisible()
  await expect(page.getByText('INV-2026-0002')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bayar' })).toHaveCount(2)

  await page.getByRole('link', { name: 'Bayar' }).first().click()
  await expect(page).toHaveURL(new RegExp(`/i/${TOKEN}$`))

  // Kembali dari DOKU.
  await page.goto(`/i/${TOKEN}?paid=1`)
  const status = page.getByTestId('provisioning-status')
  await expect(status).toContainText('Pembayaran diterima. Kami sedang menyiapkan pengaktifan')
  await page.clock.runFor(5000)
  await expect(status).toContainText('Sedang mengaktifkan internet')
  await page.clock.runFor(5000)
  await expect(status).toContainText('Internet Anda sudah aktif.')
  await expect(page.getByRole('button', { name: 'Muat ulang' })).toBeVisible()
})

test('info enabled:false menampilkan halaman netral tanpa nama tenant', async ({ page }) => {
  await stubInfo(page, false)
  await page.goto('/isolir')
  await expect(page.getByRole('heading', { name: 'Halaman ini tidak tersedia.' })).toBeVisible()
  await expect(page.getByText(TENANT.name)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cek tagihan' })).toHaveCount(0)
})

test('lookup found=false menampilkan pesan seragam dan blok bantuan', async ({ page }) => {
  await stubInfo(page, true)
  await page.route('**/api/v1/public/isolir/lookup', (route) =>
    json(route, { found: false, masked_name: '', isolated: false, invoices: [] }),
  )
  await page.goto('/isolir')
  await page.getByLabel('Username PPPoE atau nomor WhatsApp').fill('tidak-ada')
  await page.getByRole('button', { name: 'Cek tagihan' }).click()

  await expect(
    page.getByText(
      'Tidak ada tagihan menunggak untuk data ini. Jika internet Anda mati, hubungi kami.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bantuan' })).toBeVisible()
  await expect(page.locator('a[href^="tel:"]')).toBeVisible()
  await expect(page.locator('a[href^="mailto:cs@rumahnet.test"]')).toBeVisible()
})

test('tahap needs_help menampilkan tautan kontak tenant', async ({ page }) => {
  await stubInvoicePage(page, [
    {
      applicable: true,
      stage: 'needs_help',
      contact: { name: 'CS Rumah Net', phone: '0812-3456-7890', email: 'cs@rumahnet.test' },
    },
  ])
  await page.goto(`/i/${TOKEN}?paid=1`)
  const status = page.getByTestId('provisioning-status')
  await expect(status).toContainText('aktivasi tertunda')
  await expect(status.locator('a[href="tel:081234567890"]')).toBeVisible()
  await expect(status.locator('a[href="https://wa.me/6281234567890"]')).toBeVisible()
  await expect(status.locator('a[href="mailto:cs@rumahnet.test"]')).toBeVisible()
})

/**
 * Sesi terisolir hanya bisa menjangkau aplikasi (walled garden: origin app + API):
 * paket ke origin lain (Google Fonts dll.) dibuang tanpa jawaban. Halaman tidak
 * boleh menunggu resource asing untuk tampil. Pada build preview API berada di
 * origin lain (VITE_API_URL), jadi path `/api/` tetap diteruskan (lalu di-stub).
 */
async function isolateFromForeignOrigins(page: Page, mode: 'abort' | 'hang') {
  const appOrigin = new URL('http://127.0.0.1:4173').origin
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.origin === appOrigin || url.pathname.startsWith('/api/')) return route.continue()
    // hang = paket dibuang (tidak pernah dijawab), seperti jaringan isolir sesungguhnya.
    return mode === 'abort' ? route.abort() : new Promise<void>(() => {})
  })
}

for (const mode of ['abort', 'hang'] as const) {
  test(`halaman isolir tampil tanpa resource origin lain (${mode})`, async ({ page }) => {
    await isolateFromForeignOrigins(page, mode)
    await stubInfo(page, true)
    await page.goto('/isolir', { waitUntil: 'commit' })
    await expect(page.getByRole('heading', { name: 'Tagihan Internet' })).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByLabel('Username PPPoE atau nomor WhatsApp')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cek tagihan' })).toBeVisible()
  })
}
