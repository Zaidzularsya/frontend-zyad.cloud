/**
 * Tipe section yang dikenal oleh renderer.
 * Digunakan untuk validasi, section-registry lookup, dan type narrowing.
 */
export const KNOWN_SECTION_TYPES = [
  'hero',
  'benefits',
  'services',
  'problem',
  'solution',
  'demo',
  'faq',
  'cta',
  'footer',
  'features',
  'content',
  'portfolio',
  'about',
  'contact',
  'pricing',
] as const

export type KnownSectionType = (typeof KNOWN_SECTION_TYPES)[number]

/**
 * Tipe section yang didukung section-registry dengan Vue component.
 * Tipe di luar list ini akan di-render sebagai null (tidak ada fallback component).
 */
export const RENDERER_SUPPORTED_TYPES: KnownSectionType[] = [
  'hero',
  'benefits',
  'services',
  'problem',
  'solution',
  'demo',
  'faq',
  'cta',
  'footer',
]

/**
 * Mapping section type → label yang readable untuk UI admin/builder.
 */
export const SECTION_TYPE_LABELS: Record<KnownSectionType, string> = {
  hero: 'Hero Section',
  benefits: 'Benefits Section',
  services: 'Services Section',
  problem: 'Problem Section',
  solution: 'Solution Section',
  demo: 'Demo Section',
  faq: 'FAQ Section',
  cta: 'CTA Section',
  footer: 'Footer Section',
  features: 'Features Section',
  content: 'Content Section',
  portfolio: 'Portfolio Section',
  about: 'About Section',
  contact: 'Contact Section',
  pricing: 'Pricing Section',
}

/**
 * Cek apakah sebuah string adalah tipe section yang dikenal.
 */
export function isKnownSectionType(type: string): type is KnownSectionType {
  return KNOWN_SECTION_TYPES.includes(type as KnownSectionType)
}
