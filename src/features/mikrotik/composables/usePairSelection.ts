import { computed, reactive } from 'vue'

import type { PppSecret } from '@/features/mikrotik/types'

// Seleksi pasangan secret -> pelanggan pada halaman Akun PPPoE. Satu secret paling banyak satu
// baris (kunci Map), tetapi akun yang sama boleh dipilih untuk beberapa secret.
export function usePairSelection() {
  const selected = reactive(new Map<string, string>())
  // Baris yang sengaja dilepas pengguna: jangan dipilih ulang otomatis saat data dimuat ulang.
  const dismissed = new Set<string>()

  const count = computed(() => selected.size)

  function toggle(secretId: string, accountId: string) {
    if (selected.has(secretId)) {
      selected.delete(secretId)
      dismissed.add(secretId)
      return
    }
    dismissed.delete(secretId)
    selected.set(secretId, accountId)
  }

  function setAccount(secretId: string, accountId: string) {
    dismissed.delete(secretId)
    selected.set(secretId, accountId)
  }

  function clear(secretId: string) {
    selected.delete(secretId)
    dismissed.add(secretId)
  }

  // Hanya usulan hijau (basis phone/name dengan account_id) pada secret yang belum terpasang.
  function selectAllSuggested(rows: PppSecret[]) {
    for (const row of rows) {
      const s = row.suggestion
      if (row.account_id || row.needs_original_profile || !s || !s.account_id) continue
      if (s.basis === 'ambiguous' || dismissed.has(row.id) || selected.has(row.id)) continue
      selected.set(row.id, s.account_id)
    }
  }

  function reset() {
    selected.clear()
    dismissed.clear()
  }

  return { selected, count, toggle, setAccount, clear, selectAllSuggested, reset }
}
