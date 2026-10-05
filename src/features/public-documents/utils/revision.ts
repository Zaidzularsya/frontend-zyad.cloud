// Kategori revisi — cerminan backend `domain.RevisionCategories()`; urutan dipakai di UI.
export type RevisionCategory =
  | 'price'
  | 'quantity'
  | 'items'
  | 'specification'
  | 'schedule'
  | 'payment_terms'
  | 'validity'
  | 'other'

export const REVISION_CATEGORIES: { value: RevisionCategory; label: string }[] = [
  { value: 'price', label: 'Harga/diskon' },
  { value: 'quantity', label: 'Kuantitas' },
  { value: 'items', label: 'Item/produk' },
  { value: 'specification', label: 'Spesifikasi/deskripsi' },
  { value: 'schedule', label: 'Jadwal pelaksanaan' },
  { value: 'payment_terms', label: 'Syarat pembayaran' },
  { value: 'validity', label: 'Masa berlaku' },
  { value: 'other', label: 'Lainnya' },
]

export function categoryLabel(value: string): string {
  return REVISION_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

const MAX_NOTE = 2000

function validateName(name: string): string | null {
  const length = [...name.trim()].length
  if (length < 2) return 'Nama minimal 2 karakter.'
  if (length > 150) return 'Nama maksimal 150 karakter.'
  return null
}

export function validateApprove(f: { name: string; agree: boolean }): string | null {
  return validateName(f.name) ?? (f.agree ? null : 'Centang persetujuan terlebih dahulu.')
}

export function validateRevision(f: {
  name: string
  categories: string[]
  note: string
}): string | null {
  const nameError = validateName(f.name)
  if (nameError) return nameError
  if (f.categories.length === 0) return 'Pilih minimal satu bagian yang perlu direvisi.'
  const note = f.note.trim()
  if (f.categories.includes('other') && note === '') {
    return 'Jelaskan revisi yang diinginkan pada catatan.'
  }
  if ([...note].length > MAX_NOTE) return 'Catatan maksimal 2.000 karakter.'
  return null
}
