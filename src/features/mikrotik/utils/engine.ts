import type { IsolationEngine } from '@/features/mikrotik/types'

export const ENGINE_OFF_MESSAGE = 'Mesin isolir dinonaktifkan operator'
export const ENGINE_DRY_RUN_MESSAGE =
  'Mesin isolir operator dalam mode uji (dry-run): tidak ada koneksi yang diputus.'

// Alasan aksi pilot/aktivasi tertahan; null bila mesin `on`. StartPilotTest butuh engine `on`.
export function engineBlockReason(engine: IsolationEngine): string | null {
  if (engine === 'on') return null
  return engine === 'dry_run' ? ENGINE_DRY_RUN_MESSAGE : ENGINE_OFF_MESSAGE
}
