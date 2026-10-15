export type AnimationGroup =
  | 'entrance'
  | 'delay'
  | 'duration'
  | 'stagger'
  | 'parallax'
  | 'tilt'
  | 'hover'

export interface AnimationOption {
  value: string // nama kelas lengkap; '' = tidak ada
  label: string
}

/**
 * Kelompok kelas animasi yang dikelola panel "Animasi". Satu kelompok = paling
 * banyak satu kelas aktif. Kelas lain (`zy-anim-hero`, `zy-aurora`, `zy-float`,
 * `zy-marquee`, ...) sengaja di luar kelompok ini sehingga tidak pernah dihapus panel.
 * Setiap value harus ada di `zy-motion.css` (dijaga animation-classes.spec.ts).
 */
export const ANIMATION_GROUPS: Record<
  AnimationGroup,
  { label: string; options: AnimationOption[] }
> = {
  entrance: {
    label: 'Efek masuk',
    options: [
      { value: '', label: 'Tidak ada' },
      { value: 'zy-anim-fade-up', label: 'Muncul dari bawah' },
      { value: 'zy-anim-fade-in', label: 'Memudar' },
      { value: 'zy-anim-zoom-in', label: 'Membesar' },
      { value: 'zy-anim-slide-left', label: 'Geser dari kiri' },
      { value: 'zy-anim-slide-right', label: 'Geser dari kanan' },
      { value: 'zy-anim-blur-in', label: 'Blur ke jelas' },
      { value: 'zy-anim-clip-reveal', label: 'Wipe' },
    ],
  },
  delay: {
    label: 'Delay',
    options: [
      { value: '', label: '0' },
      ...[100, 200, 300, 400, 500, 600, 700, 800].map((ms) => ({
        value: `zy-delay-${ms}`,
        label: `${ms} ms`,
      })),
    ],
  },
  duration: {
    label: 'Durasi',
    options: [
      { value: '', label: 'Normal' },
      { value: 'zy-dur-fast', label: 'Cepat' },
      { value: 'zy-dur-slow', label: 'Lambat' },
    ],
  },
  stagger: {
    label: 'Stagger anak',
    options: [
      { value: '', label: 'Nonaktif' },
      { value: 'zy-stagger', label: 'Aktif' },
    ],
  },
  parallax: {
    label: 'Parallax',
    options: [
      { value: '', label: 'Tidak ada' },
      { value: 'zy-parallax-slow', label: 'Lambat' },
      { value: 'zy-parallax-med', label: 'Sedang' },
      { value: 'zy-parallax-fast', label: 'Cepat' },
    ],
  },
  tilt: {
    label: 'Tilt 3D',
    options: [
      { value: '', label: 'Nonaktif' },
      { value: 'zy-tilt', label: 'Aktif' },
    ],
  },
  hover: {
    label: 'Hover',
    options: [
      { value: '', label: 'Tidak ada' },
      { value: 'zy-hover-lift', label: 'Angkat' },
      { value: 'zy-hover-glow', label: 'Glow' },
    ],
  },
}

function groupClasses(group: AnimationGroup): string[] {
  return ANIMATION_GROUPS[group].options.map((o) => o.value).filter(Boolean)
}

/** Kelas aktif untuk kelompok ini, atau '' bila tidak ada. */
export function readGroupChoice(classes: string[], group: AnimationGroup): string {
  const own = groupClasses(group)
  return classes.find((c) => own.includes(c)) ?? ''
}

/** Selisih kelas agar kelompok hanya berisi `value` ('' = kosongkan). Tidak menyentuh kelas lain. */
export function applyGroupChoice(
  classes: string[],
  group: AnimationGroup,
  value: string,
): { add: string[]; remove: string[] } {
  const own = groupClasses(group)
  const remove = own.filter((c) => c !== value && classes.includes(c))
  const add = value && !classes.includes(value) ? [value] : []
  return { add, remove }
}
