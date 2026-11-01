import type {
  PairBulkItem,
  PairBulkItemResult,
  PppSecret,
  SecretListParams,
} from '@/features/mikrotik/types'

export const BULK_LIMIT = 200 // MaxPairBulkItems di backend.

// Kode hasil yang tidak mungkin berhasil bila diulang: baris dilepas dari seleksi.
export const NON_RETRYABLE_CODES = [
  'MIKROTIK_SECRET_ALREADY_PAIRED',
  'MIKROTIK_SECRET_NOT_FOUND',
  'MIKROTIK_SECRET_NOT_PAIRABLE',
]

export function chunkItems<T>(items: T[], size: number = BULK_LIMIT): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// Kirim bertahap berurutan. Chunk yang melempar galat menandai seluruh barisnya gagal; hasil
// chunk sebelumnya tetap dipertahankan. onProgress menerima jumlah item yang sudah diproses.
export async function pairInChunks(
  items: PairBulkItem[],
  send: (chunk: PairBulkItem[]) => Promise<{ results: PairBulkItemResult[] }>,
  onProgress?: (processed: number, total: number) => void,
  errorMessage: (error: unknown) => string = () => 'Permintaan gagal.',
): Promise<PairBulkItemResult[]> {
  const all: PairBulkItemResult[] = []
  let processed = 0
  for (const chunk of chunkItems(items)) {
    try {
      all.push(...(await send(chunk)).results)
    } catch (error) {
      const message = errorMessage(error)
      all.push(
        ...chunk.map((c) => ({
          secret_id: c.secret_id,
          ok: false,
          code: 'MIKROTIK_INTERNAL',
          message,
        })),
      )
    }
    processed += chunk.length
    onProgress?.(processed, items.length)
  }
  return all
}

export function shouldAutoAnalyze(p: {
  routerId: string
  alreadyAnalyzed: Set<string>
  unpairedTotal: number
  suggestedTotal: number
  needsDecisionTotal: number
  isPending: boolean
  canAnalyze: boolean
}): boolean {
  if (!p.routerId || !p.canAnalyze || p.isPending || p.alreadyAnalyzed.has(p.routerId)) return false
  return p.unpairedTotal > 0 && p.suggestedTotal + p.needsDecisionTotal === 0
}

// Item yang dikirim = baris terpilih yang termuat di tampilan sekarang, supaya jumlah di footer
// sama dengan yang terlihat tenant (pilihan di halaman lain tidak ikut terkirim).
export function visibleItems(selected: Map<string, string>, rows: PppSecret[]): PairBulkItem[] {
  const out: PairBulkItem[] = []
  for (const r of rows) {
    const accountId = selected.get(r.id)
    if (accountId) out.push({ secret_id: r.id, account_id: accountId })
  }
  return out
}

export type PairingTab = 'all' | 'suggested' | 'needs_decision' | 'needs_profile' | 'paired'

export function buildListParams(p: {
  routerId: string
  search: string
  tab: PairingTab
  page: number
  perPage: number
}): SecretListParams {
  const params: SecretListParams = {
    router_id: p.routerId || undefined,
    q: p.search || undefined,
    paired: p.tab === 'paired',
    page: p.page,
    per_page: p.perPage,
  }
  if (p.tab === 'suggested') params.suggestion = 'suggested'
  if (p.tab === 'needs_decision') params.suggestion = 'needs_decision'
  if (p.tab === 'needs_profile') params.needs_original_profile = true
  return params
}

export function progressText(processed: number, total: number): string {
  return processed > 0 && processed < total
    ? `Memasangkan ${processed} dari ${total} data…`
    : `Memasangkan ${total} data…`
}
