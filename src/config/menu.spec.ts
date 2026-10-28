import { describe, expect, it } from 'vitest'

import { filterMenuByEntitlement } from '@/features/entitlements/utils/menu-filter'

import { customerAccountMenuItems, customerMenuGroups, type MenuGroup } from './menu'

function labels(groups: MenuGroup[]): string[] {
  return groups.flatMap((g) =>
    g.items.flatMap((i) => [i.label, ...(i.children?.map((c) => c.label) ?? [])]),
  )
}

// Fitur yang dimiliki workspace; sisanya dianggap tersembunyi (sama seperti useHiddenFeatures).
const visibleMenu = (owned: string[]) =>
  labels(filterMenuByEntitlement(customerMenuGroups, (key) => !owned.includes(key)))

describe('customerMenuGroups', () => {
  it('workspace reseller (landing saja): tanpa menu yang ditolak backend, dengan Balance', () => {
    const menu = visibleMenu(['landing.enabled', 'landing.page_activation'])
    expect(menu).toContain('Landing Page')
    expect(menu).toContain('Balance')
    expect(menu).toContain('Files')
    // /app/catalog dan /app/mailboxes butuh crm.enabled atau receivable.enabled.
    expect(menu).not.toContain('Produk')
    expect(menu).not.toContain('Akun Email')
    expect(menu).not.toContain('Leads')
  })

  it('Produk dan Akun Email tampil bila salah satu dari crm.enabled / receivable.enabled ada', () => {
    for (const feature of ['crm.enabled', 'receivable.enabled']) {
      const menu = visibleMenu([feature])
      expect(menu, feature).toContain('Produk')
      expect(menu, feature).toContain('Akun Email')
    }
  })

  it('Tagihan dan Pemakaian Paket pindah ke submenu Account, bukan group Billing', () => {
    expect(customerAccountMenuItems.map((i) => i.label)).toEqual(['Tagihan', 'Pemakaian Paket'])
    const menu = visibleMenu([])
    expect(menu).not.toContain('Tagihan')
    expect(menu).not.toContain('Pemakaian Paket')
    expect(menu).not.toContain('Saldo Pembayaran')
  })

  it('Pengaturan menjadi item terakhir group Billing', () => {
    const billing = customerMenuGroups.find((g) => g.label === 'Billing')!
    expect(billing.items.at(-1)?.label).toBe('Pengaturan')
    expect(billing.items.map((i) => i.label)).not.toContain('Pengaturan Penagihan')
  })

  it('Invoice Halaman hanya untuk workspace yang boleh menjual halaman (landing.page_activation)', () => {
    expect(visibleMenu(['landing.enabled', 'landing.page_activation'])).toContain('Invoice Halaman')
    expect(visibleMenu(['landing.enabled'])).not.toContain('Invoice Halaman')
    expect(visibleMenu([])).not.toContain('Invoice Halaman')
  })

  it('menu Landing Page lain tetap mengikuti landing.enabled', () => {
    const menu = visibleMenu(['landing.enabled'])
    expect(menu).toContain('Pages')
    expect(menu).not.toContain('Invoice Halaman')
  })
})
