export type RedirectTarget = { kind: 'internal' | 'external'; url: string }

/**
 * Hanya path internal (`/path`, bukan `//host`) atau http(s) yang boleh dipakai sebagai tujuan
 * redirect setelah form terkirim. Selain itu (javascript:, data:, mailto:, dll) -> null.
 */
export function redirectTarget(raw: string | null | undefined): RedirectTarget | null {
  const url = (raw ?? '').trim()
  if (/^\/(?![/\\])/.test(url)) return { kind: 'internal', url }
  if (/^https?:\/\/[^\s]/i.test(url)) return { kind: 'external', url }
  return null
}
