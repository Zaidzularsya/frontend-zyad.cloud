/**
 * Shared normalizer utilities untuk landing page data.
 * Dipakai oleh builder dan renderer untuk transform raw API response.
 */

type RawRecord = Record<string, unknown>

/**
 * Helper untuk pick value dari raw record dengan fallback ke key alternatif.
 * Mendukung snake_case (backend Go) dan PascalCase (JSON serialization).
 */
export function pickValue<T>(raw: RawRecord, snake: string, pascal: string, fallback: T): T {
  return (raw[snake] ?? raw[pascal] ?? fallback) as T
}

/**
 * Ambil string value dari raw record, fallback ke string kosong.
 */
export function pickString(raw: RawRecord, ...keys: string[]): string {
  for (const key of keys) {
    const val = raw[key]
    if (typeof val === 'string') return val
  }
  return ''
}

/**
 * Ambil number value dari raw record, fallback ke 0.
 */
export function pickNumber(raw: RawRecord, ...keys: string[]): number {
  for (const key of keys) {
    const val = raw[key]
    if (typeof val === 'number') return val
  }
  return 0
}

/**
 * Ambil boolean value dari raw record.
 */
export function pickBoolean(raw: RawRecord, keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const val = raw[key]
    if (typeof val === 'boolean') return val
  }
  return fallback
}

/**
 * Ambil object value dari raw record, fallback ke {}.
 */
export function pickObject(raw: RawRecord, ...keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const val = raw[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return val as Record<string, unknown>
    }
  }
  return {}
}

/**
 * Ambil array value dari raw record, fallback ke [].
 */
export function pickArray(raw: RawRecord, ...keys: string[]): RawRecord[] {
  for (const key of keys) {
    const val = raw[key]
    if (Array.isArray(val)) return val as RawRecord[]
  }
  return []
}
