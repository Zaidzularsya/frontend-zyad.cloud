import { computed, reactive } from 'vue'

import type { PppSecret } from '@/features/mikrotik/types'

function suggestedAccount(row: PppSecret): string {
  const s = row.suggestion
  return s && s.basis !== 'ambiguous' ? s.account_id : ''
}

// Seleksi pasangan secret -> pelanggan pada halaman Akun PPPoE. Satu secret paling banyak satu
// baris (kunci Map), tetapi akun yang sama boleh dipilih untuk beberapa secret.
export function usePairSelection() {
  const selected = reactive(new Map<string, string>())
  // Baris yang akunnya dipilih manual lewat AccountPicker; sisanya mengikuti usulan.
  const manual = new Set<string>()
  // Baris yang sengaja dilepas pengguna: jangan dipilih ulang otomatis saat data dimuat ulang.
  const dismissed = new Set<string>()

  const count = computed(() => selected.size)

  function remove(secretId: string) {
    selected.delete(secretId)
    manual.delete(secretId)
  }

  function toggle(secretId: string, accountId: string) {
    if (selected.has(secretId)) {
      remove(secretId)
      dismissed.add(secretId)
      return
    }
    dismissed.delete(secretId)
    selected.set(secretId, accountId)
  }

  // Centang/lepas dari checkbox baris: centang selalu mengikuti usulan saat ini (bukan pilihan
  // manual lama), supaya akun yang tampil == akun yang dikirim.
  function toggleRow(row: PppSecret) {
    if (selected.has(row.id)) return toggle(row.id, '')
    const account = suggestedAccount(row)
    if (account) toggle(row.id, account)
  }

  function setAccount(secretId: string, accountId: string) {
    dismissed.delete(secretId)
    manual.add(secretId)
    selected.set(secretId, accountId)
  }

  function clear(secretId: string) {
    remove(secretId)
    dismissed.add(secretId)
  }

  // Hanya usulan hijau (basis phone/name dengan account_id) pada secret yang belum terpasang.
  function selectAllSuggested(rows: PppSecret[]) {
    for (const row of rows) {
      const account = suggestedAccount(row)
      if (row.account_id || row.needs_original_profile || !account) continue
      if (dismissed.has(row.id) || selected.has(row.id)) continue
      selected.set(row.id, account)
    }
  }

  // Selaraskan seleksi dengan data terbaru. Invarian: untuk baris non-manual, akun yang
  // dikirim == akun usulan yang tampil. Baris yang sudah terpasang / butuh profile asli dilepas.
  function syncRows(rows: PppSecret[]) {
    for (const row of rows) {
      if (!selected.has(row.id)) continue
      if (row.account_id || row.needs_original_profile) {
        remove(row.id)
        continue
      }
      if (manual.has(row.id)) continue
      const account = suggestedAccount(row)
      if (!account) remove(row.id)
      else if (selected.get(row.id) !== account) selected.set(row.id, account)
    }
  }

  function prune(secretIds: string[]) {
    for (const id of secretIds) remove(id)
  }

  function reset() {
    selected.clear()
    manual.clear()
    dismissed.clear()
  }

  return {
    selected,
    count,
    toggle,
    toggleRow,
    setAccount,
    clear,
    selectAllSuggested,
    syncRows,
    prune,
    reset,
  }
}
