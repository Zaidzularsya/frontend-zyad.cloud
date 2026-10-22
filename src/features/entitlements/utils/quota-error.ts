import { errorCode } from '@/features/catalog/utils/errors'

// Backend menolak create yang melewati kuota paket dengan 409 + code QUOTA_EXCEEDED.
export function isQuotaExceededError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  return status === 409 && errorCode(error) === 'QUOTA_EXCEEDED'
}

export function quotaExceededMessage(noun: string): string {
  return `Kuota ${noun} paket Anda sudah penuh. Upgrade plan untuk menambah ${noun} baru.`
}
