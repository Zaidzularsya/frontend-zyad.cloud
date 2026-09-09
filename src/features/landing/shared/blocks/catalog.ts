import type { LandingSection } from '@/features/landing/shared/types/landing.types'
import type { BlockDefinition, BlockGroup } from './types'

/**
 * The visual builder block catalog — single source of truth for the palette,
 * the seed content on insert, and the property-panel schema. See BlockDefinition.
 */
export const BLOCK_CATALOG: BlockDefinition[] = [
  {
    id: 'element.headline',
    sectionType: 'content',
    variant: 'element.headline',
    label: 'Headline',
    description: 'Judul singkat satu baris.',
    icon: 'title',
    group: 'elements',
    keyPrefix: 'el-headline',
    defaultContent: {
      text: 'Judul baru',
      level: 'h2',
    },
    defaultStyle: {
      variant: 'element.headline',
      align: 'center',
      typography: { size: 32, weight: '700' },
    },
    schema: [
      { key: 'text', label: 'Teks', type: 'text', required: true },
      { key: 'level', label: 'Tingkat', type: 'select', options: ['h1', 'h2', 'h3', 'h4'] },
    ],
  },
  {
    id: 'element.paragraph',
    sectionType: 'content',
    variant: 'element.paragraph',
    label: 'Paragraph',
    description: 'Blok teks dengan format inline.',
    icon: 'notes',
    group: 'elements',
    keyPrefix: 'el-paragraph',
    defaultContent: {
      bodyHtml: 'Tulis paragraf di sini. Klik dua kali di kanvas untuk mengedit.',
    },
    defaultStyle: {
      variant: 'element.paragraph',
      align: 'center',
      typography: { size: 16 },
    },
    schema: [{ key: 'bodyHtml', label: 'Isi', type: 'richtext' }],
  },
  {
    id: 'element.button',
    sectionType: 'content',
    variant: 'element.button',
    label: 'Button',
    description: 'Tombol tautan tunggal.',
    icon: 'smart_button',
    group: 'elements',
    keyPrefix: 'el-button',
    defaultContent: {
      label: 'Klik di sini',
      url: '#',
      target: '_self',
    },
    defaultStyle: {
      variant: 'element.button',
      align: 'center',
      colors: { primary: '#2563EB', text: '#ffffff' },
      box: { radius: 8 },
    },
    schema: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'url', label: 'Tautan', type: 'url' },
      { key: 'target', label: 'Buka di', type: 'select', options: ['_self', '_blank'] },
    ],
  },
  {
    id: 'element.image',
    sectionType: 'content',
    variant: 'element.image',
    label: 'Image',
    description: 'Satu gambar dari URL.',
    icon: 'image',
    group: 'elements',
    keyPrefix: 'el-image',
    defaultContent: {
      src: '',
      alt: '',
    },
    defaultStyle: {
      variant: 'element.image',
      align: 'center',
      box: { radius: 12, width: 480 },
    },
    schema: [
      { key: 'src', label: 'URL gambar', type: 'image', required: true },
      { key: 'alt', label: 'Teks alternatif', type: 'text' },
    ],
  },
  {
    id: 'element.divider',
    sectionType: 'content',
    variant: 'element.divider',
    label: 'Divider',
    description: 'Garis pemisah horizontal.',
    icon: 'horizontal_rule',
    group: 'elements',
    keyPrefix: 'el-divider',
    defaultContent: {},
    defaultStyle: {
      variant: 'element.divider',
      box: { borderColor: '#e2e8f0', borderWidth: 1, width: 640 },
    },
    schema: [],
  },
  {
    id: 'hero.default',
    sectionType: 'hero',
    label: 'Hero',
    description: 'Headline, intro singkat, dan dua CTA utama.',
    icon: 'rocket_launch',
    group: 'hero',
    keyPrefix: 'hero',
    defaultContent: {
      badge: 'Solusi digital terpadu',
      titleHtml: 'Bangun landing page yang siap dipublish',
      description:
        'Perkenalkan bisnis, layanan, dan CTA utama dengan tampilan yang rapi dan mudah dikelola.',
      primaryCta: 'Hubungi Kami',
      primaryCtaUrl: '#contact',
      secondaryCta: 'Lihat Layanan',
      secondaryCtaUrl: '#solusi',
    },
    defaultStyle: {},
    schema: [
      { key: 'badge', label: 'Badge', type: 'text', placeholder: 'Baru · Tersedia sekarang' },
      { key: 'titleHtml', label: 'Judul', type: 'richtext', required: true },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      { key: 'primaryCta', label: 'Tombol utama', type: 'text' },
      { key: 'primaryCtaUrl', label: 'Link tombol utama', type: 'url' },
      { key: 'secondaryCta', label: 'Tombol sekunder', type: 'text' },
      { key: 'secondaryCtaUrl', label: 'Link tombol sekunder', type: 'url' },
    ],
  },
  {
    id: 'hero.threejs',
    sectionType: 'hero',
    variant: 'three_js',
    label: 'Hero 3D',
    description: 'Hero dengan animasi WebGL. Tidak ada teks yang bisa diedit.',
    icon: 'deployed_code',
    group: 'hero',
    keyPrefix: 'hero',
    defaultContent: {},
    defaultStyle: { variant: 'three_js' },
    schema: [],
  },
  {
    id: 'content.problem',
    sectionType: 'content',
    label: 'Problem',
    description: 'Konteks masalah dan pain point pelanggan.',
    icon: 'help',
    group: 'content',
    keyPrefix: 'problem',
    defaultContent: {
      title: 'Tantangan yang sering menghambat pertumbuhan',
      description: 'Jelaskan masalah utama audiens sebelum menawarkan solusi.',
      cards: [
        {
          icon: 'schedule',
          title: 'Proses lambat',
          desc: 'Alur manual membuat tim sulit bergerak cepat.',
        },
        {
          icon: 'sync_problem',
          title: 'Data terpisah',
          desc: 'Informasi tersebar dan sulit dipakai untuk keputusan.',
        },
        {
          icon: 'visibility_off',
          title: 'Kurang visibilitas',
          desc: 'Performa bisnis tidak mudah dipantau dari satu tempat.',
        },
      ],
    },
    defaultStyle: {},
    schema: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      {
        key: 'cards',
        label: 'Kartu masalah',
        type: 'repeater',
        itemSchema: [
          { key: 'icon', label: 'Ikon (Material Symbols)', type: 'text' },
          { key: 'title', label: 'Judul', type: 'text', required: true },
          { key: 'desc', label: 'Deskripsi', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'content.benefits',
    sectionType: 'content',
    variant: 'benefits',
    label: 'Benefits',
    description: 'Manfaat bisnis yang ingin ditonjolkan.',
    icon: 'insights',
    group: 'content',
    keyPrefix: 'benefits',
    defaultContent: {
      title: 'Manfaat yang langsung terasa',
      description: 'Ringkas alasan kenapa pengunjung perlu memilih layanan ini.',
      benefits: [
        {
          icon: 'rocket_launch',
          title: 'Lebih cepat publish',
          desc: 'Struktur landing page siap dipakai tanpa mulai dari nol.',
        },
        {
          icon: 'tune',
          title: 'Mudah disesuaikan',
          desc: 'Setiap section bisa diaktifkan, disusun, dan diperbarui.',
        },
        {
          icon: 'insights',
          title: 'Lebih fokus konversi',
          desc: 'Konten diarahkan ke CTA dan kebutuhan calon pelanggan.',
        },
      ],
    },
    defaultStyle: { variant: 'benefits' },
    schema: [
      { key: 'title', label: 'Judul', type: 'text', required: true },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      {
        key: 'benefits',
        label: 'Manfaat',
        type: 'repeater',
        itemSchema: [
          { key: 'icon', label: 'Ikon (Material Symbols)', type: 'text' },
          { key: 'title', label: 'Judul', type: 'text', required: true },
          { key: 'desc', label: 'Deskripsi', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'content.solution',
    sectionType: 'content',
    variant: 'solution',
    label: 'Solution / Steps',
    description: 'Langkah kerja atau alur solusi.',
    icon: 'timeline',
    group: 'content',
    keyPrefix: 'solution',
    defaultContent: {
      title: 'Cara kami membantu dari ide sampai publish',
      description: 'Jelaskan proses kerja secara ringkas dan mudah diikuti.',
      ctaText: 'Mulai Diskusi',
      ctaUrl: '#contact',
      steps: [
        {
          number: 1,
          title: 'Discovery',
          desc: 'Pahami kebutuhan dan target halaman.',
          highlight: false,
        },
        {
          number: 2,
          title: 'Mapping',
          desc: 'Susun section, konten, dan CTA utama.',
          highlight: true,
        },
        {
          number: 3,
          title: 'Launch',
          desc: 'Publish halaman dan pantau performanya.',
          highlight: false,
        },
      ],
    },
    defaultStyle: { variant: 'solution' },
    schema: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      { key: 'ctaText', label: 'Teks CTA', type: 'text' },
      { key: 'ctaUrl', label: 'Link CTA', type: 'url' },
      {
        key: 'steps',
        label: 'Langkah',
        type: 'repeater',
        itemSchema: [
          { key: 'number', label: 'Nomor', type: 'number' },
          { key: 'title', label: 'Judul', type: 'text', required: true },
          { key: 'desc', label: 'Deskripsi', type: 'textarea' },
          { key: 'highlight', label: 'Sorot langkah ini', type: 'checkbox' },
        ],
      },
    ],
  },
  {
    id: 'features.list',
    sectionType: 'features',
    label: 'Layanan / Fitur',
    description: 'Daftar layanan atau fitur inti.',
    icon: 'grid_view',
    group: 'content',
    keyPrefix: 'features',
    defaultContent: {
      title: 'Layanan yang bisa langsung ditawarkan',
      description: 'Tampilkan layanan utama agar pengunjung cepat memahami nilai bisnis.',
      services: [
        {
          icon: 'web',
          title: 'Website & Company Profile',
          desc: 'Halaman publik untuk memperkenalkan brand, layanan, dan portofolio.',
        },
        {
          icon: 'dashboard',
          title: 'Dashboard Operasional',
          desc: 'Pantau data bisnis dan proses internal dari satu tampilan.',
        },
        {
          icon: 'campaign',
          title: 'Campaign Landing Page',
          desc: 'Buat halaman promosi yang fokus pada konversi.',
        },
      ],
    },
    defaultStyle: {},
    schema: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      {
        key: 'services',
        label: 'Item',
        type: 'repeater',
        itemSchema: [
          { key: 'icon', label: 'Ikon (Material Symbols)', type: 'text' },
          { key: 'title', label: 'Judul', type: 'text', required: true },
          { key: 'desc', label: 'Deskripsi', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'faq.default',
    sectionType: 'faq',
    label: 'FAQ',
    description: 'Pertanyaan umum sebelum pengunjung menghubungi.',
    icon: 'quiz',
    group: 'content',
    keyPrefix: 'faq',
    defaultContent: {
      title: 'Pertanyaan yang sering diajukan',
      items: [
        {
          question: 'Apakah konten bisa disesuaikan?',
          answer: 'Bisa, setiap section menyimpan konten yang dapat diperbarui.',
        },
        {
          question: 'Apakah halaman bisa dipublish ulang?',
          answer: 'Bisa, status publish dikelola dari halaman admin landing page.',
        },
      ],
    },
    defaultStyle: {},
    schema: [
      { key: 'title', label: 'Judul', type: 'text' },
      {
        key: 'items',
        label: 'Pertanyaan',
        type: 'repeater',
        itemSchema: [
          { key: 'question', label: 'Pertanyaan', type: 'text', required: true },
          { key: 'answer', label: 'Jawaban', type: 'richtext' },
        ],
      },
    ],
  },
  {
    id: 'statistics.default',
    sectionType: 'statistics',
    label: 'Statistik',
    description: 'Angka pencapaian sebagai social proof.',
    icon: 'query_stats',
    group: 'social-proof',
    keyPrefix: 'stats',
    defaultContent: {
      items: [
        {
          value: '99.9%',
          label: 'Uptime',
          description: 'Layanan berjalan stabil sepanjang tahun.',
        },
        {
          value: '4.9/5',
          label: 'Kepuasan',
          description: 'Rata-rata rating dari pelanggan aktif.',
        },
        { value: '120+', label: 'Klien', description: 'Bisnis yang sudah dibantu tim kami.' },
      ],
    },
    defaultStyle: {},
    schema: [
      {
        key: 'items',
        label: 'Metrik',
        type: 'repeater',
        itemSchema: [
          { key: 'value', label: 'Angka', type: 'text', required: true },
          { key: 'label', label: 'Label', type: 'text', required: true },
          { key: 'description', label: 'Keterangan', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'partner_logos.default',
    sectionType: 'partner_logos',
    label: 'Logo Partner',
    description: 'Deretan nama / logo klien atau partner.',
    icon: 'handshake',
    group: 'social-proof',
    keyPrefix: 'logos',
    defaultContent: {
      title: 'Dipercaya oleh tim yang berkembang',
      logos: ['Acme', 'Globex', 'Umbrella', 'Initech'],
    },
    defaultStyle: {},
    schema: [
      { key: 'title', label: 'Judul', type: 'text' },
      {
        key: 'logos',
        label: 'Nama partner',
        type: 'repeater',
        itemSchema: [{ key: 'value', label: 'Nama', type: 'text', required: true }],
      },
    ],
  },
  {
    id: 'pricing.default',
    sectionType: 'pricing',
    label: 'Pricing',
    description: 'Daftar paket harga.',
    icon: 'sell',
    group: 'conversion',
    keyPrefix: 'pricing',
    defaultContent: {
      title: 'Pilih paket yang sesuai',
      source: 'custom',
      plans: [
        {
          name: 'Starter',
          priceLabel: 'Rp199rb/bln',
          features: ['1 landing page', 'Custom domain', 'Analytics dasar'],
        },
        {
          name: 'Growth',
          priceLabel: 'Rp499rb/bln',
          features: ['5 landing page', 'A/B testing', 'Integrasi lead'],
        },
      ],
    },
    defaultStyle: {},
    schema: [
      { key: 'title', label: 'Judul', type: 'text' },
      {
        key: 'plans',
        label: 'Paket',
        type: 'repeater',
        itemSchema: [
          { key: 'name', label: 'Nama paket', type: 'text', required: true },
          { key: 'priceLabel', label: 'Label harga', type: 'text' },
          { key: 'interval', label: 'Periode', type: 'text', placeholder: '/bln' },
        ],
      },
    ],
  },
  {
    id: 'cta.default',
    sectionType: 'cta',
    label: 'CTA',
    description: 'Ajakan akhir untuk menghubungi atau membeli.',
    icon: 'ads_click',
    group: 'conversion',
    keyPrefix: 'cta',
    defaultContent: {
      title: 'Siap membawa bisnis Anda online?',
      description: 'Hubungi tim kami untuk mulai menyusun landing page yang sesuai kebutuhan.',
      primaryButtonText: 'Hubungi Kami',
      primaryUrl: '#contact',
      secondaryButtonText: 'Lihat Detail',
      secondaryUrl: '#solusi',
    },
    defaultStyle: {},
    schema: [
      { key: 'title', label: 'Judul', type: 'text', required: true },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      { key: 'primaryButtonText', label: 'Tombol utama', type: 'text' },
      { key: 'primaryUrl', label: 'Link tombol utama', type: 'url' },
      { key: 'secondaryButtonText', label: 'Tombol sekunder', type: 'text' },
      { key: 'secondaryUrl', label: 'Link tombol sekunder', type: 'url' },
    ],
  },
  {
    id: 'footer.default',
    sectionType: 'footer',
    label: 'Footer standar',
    description: 'Brand + navigasi (maks. 3 kolom) + copyright.',
    icon: 'call_to_action',
    group: 'footer',
    keyPrefix: 'footer',
    defaultContent: {},
    defaultStyle: { variant: 'default' },
    schema: [],
  },
  {
    id: 'footer.simple',
    sectionType: 'footer',
    variant: 'simple',
    label: 'Footer simple',
    description: 'Brand + copyright saja. Cocok untuk halaman campaign.',
    icon: 'call_to_action',
    group: 'footer',
    keyPrefix: 'footer',
    defaultContent: {},
    defaultStyle: { variant: 'simple' },
    schema: [],
  },
  {
    id: 'footer.newsletter',
    sectionType: 'footer',
    variant: 'newsletter',
    label: 'Footer newsletter',
    description: 'Footer standar + form berlangganan email.',
    icon: 'mark_email_read',
    group: 'footer',
    keyPrefix: 'footer',
    defaultContent: {},
    defaultStyle: { variant: 'newsletter' },
    schema: [],
  },
  {
    id: 'footer.mega',
    sectionType: 'footer',
    variant: 'mega',
    label: 'Footer mega',
    description: 'Footer standar + trust badge + CTA sekunder.',
    icon: 'call_to_action',
    group: 'footer',
    keyPrefix: 'footer',
    defaultContent: {},
    defaultStyle: { variant: 'mega' },
    schema: [],
  },
]

const BLOCK_BY_ID = new Map(BLOCK_CATALOG.map((block) => [block.id, block]))

export function blockById(id: string): BlockDefinition | undefined {
  return BLOCK_BY_ID.get(id)
}

export const BLOCK_GROUP_LABELS: Record<BlockGroup, string> = {
  elements: 'Komponen',
  hero: 'Hero',
  content: 'Konten',
  'social-proof': 'Social proof',
  conversion: 'Konversi',
  footer: 'Footer',
}

export const BLOCK_GROUP_ORDER: BlockGroup[] = [
  'elements',
  'hero',
  'content',
  'social-proof',
  'conversion',
  'footer',
]

export function blocksByGroup(): Array<{
  group: BlockGroup
  label: string
  blocks: BlockDefinition[]
}> {
  return BLOCK_GROUP_ORDER.map((group) => ({
    group,
    label: BLOCK_GROUP_LABELS[group],
    blocks: BLOCK_CATALOG.filter((block) => block.group === group),
  })).filter((entry) => entry.blocks.length > 0)
}

/** First catalog block declared for a section type (the type's default block). */
export function defaultBlockForType(sectionType: string): BlockDefinition | undefined {
  return BLOCK_CATALOG.find((block) => block.sectionType === sectionType)
}

/**
 * Resolve the catalog block that best matches a persisted section, using the
 * same variant precedence as SectionRenderer.vue
 * (section.variant -> style.renderer_component -> style.variant).
 */
export function resolveBlockForSection(
  section: Pick<LandingSection, 'type' | 'style' | 'variant'>,
): BlockDefinition | undefined {
  const style = (section.style ?? {}) as Record<string, unknown>
  const variant =
    section.variant ??
    (typeof style.renderer_component === 'string' ? style.renderer_component : undefined) ??
    (typeof style.variant === 'string' ? style.variant : undefined)

  if (variant) {
    const exact = BLOCK_CATALOG.find(
      (block) => block.sectionType === section.type && block.variant === variant,
    )
    if (exact) return exact
  }

  const typeDefault = BLOCK_CATALOG.find(
    (block) => block.sectionType === section.type && !block.variant,
  )
  if (typeDefault) return typeDefault

  return defaultBlockForType(section.type)
}
