/**
 * Page numbers to render: first, last, current ±1, with "…" gaps.
 * e.g. (6, 16) → [1, '…', 5, 6, 7, '…', 16]
 */
export function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push('…')
  for (let page = start; page <= end; page++) out.push(page)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}
