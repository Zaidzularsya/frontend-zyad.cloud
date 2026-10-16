/** Kontras WCAG 2.x untuk warna hex #rrggbb (dipakai peringatan kontras dan warna teks tombol). */

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
}

/** Rasio kontras 1..21 antara dua warna #rrggbb. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Warna teks (putih atau hampir hitam) dengan kontras tertinggi di atas `bg`. */
export function pickOnColor(bg: string): '#ffffff' | '#111111' {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111111') ? '#ffffff' : '#111111'
}
