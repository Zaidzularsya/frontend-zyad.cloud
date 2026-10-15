import type { ContractStatus } from '@/features/receivable/api/receivable.api'
import type { Tone } from '@/features/crm/sales-orders/utils/sales-order'

export const CONTRACT_STATUS: Record<ContractStatus, { label: string; tone: Tone }> = {
  active: { label: 'Aktif', tone: 'green' },
  ended: { label: 'Berakhir', tone: 'slate' },
  cancelled: { label: 'Dibatalkan', tone: 'red' },
}

// Pesan galat kontrak dari kode backend.
const messages: Record<string, string> = {
  CONTRACT_NOT_FOUND: 'Kontrak tidak ditemukan.',
  CONTRACT_NOT_ACTIVE: 'Kontrak sudah tidak aktif.',
  VALIDATION_ERROR: 'Data belum valid. Periksa tanggal akhir dan alasan (1–500 karakter).',
}

export function contractErrorMessage(error: unknown): string {
  const code = (error as { response?: { data?: { code?: string } } } | null)?.response?.data?.code
  return (code && messages[code]) || 'Terjadi kesalahan, silakan coba lagi.'
}
