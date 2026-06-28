import type { PageType } from '@/features/landing/shared/types/landing.types'

export type PageTemplateSectionBlueprint = {
  key: string
  type: string
  name: string
  content: Record<string, unknown>
  style: Record<string, unknown>
}

export type PageTemplateMenuItem = {
  label: string
  destination: string
}

export type PageTemplateBlueprint = {
  key: string
  name: string
  category: string
  description: string
  pageType: PageType
  seoFocus: string
  header: {
    menuName: string
    style: string
    ctaLabel: string
    ctaDestination: string
    items: PageTemplateMenuItem[]
  }
  sections: PageTemplateSectionBlueprint[]
  footer: PageTemplateSectionBlueprint
  config: {
    locale: string
    timezone: string
    layoutWidth: string
    spacing: string
    defaultMetaDescription: string
  }
  branding: {
    company_name: string
    tagline: string
    colors: Record<string, unknown>
    typography: Record<string, unknown>
    shape: Record<string, unknown>
    layout: Record<string, unknown>
  }
}

export const pageTemplateBlueprints: PageTemplateBlueprint[] = [
  {
    key: 'company-profile',
    name: 'Company Profile Template',
    category: 'company',
    description:
      'Blueprint halaman profil bisnis dengan hero, layanan, benefit, FAQ, CTA, dan footer.',
    pageType: 'company_profile',
    seoFocus: 'Brand, layanan utama, dan wilayah operasional.',
    header: {
      menuName: 'Company Profile Header',
      style: 'sticky compact',
      ctaLabel: 'Hubungi Kami',
      ctaDestination: '#contact',
      items: [
        { label: 'Solusi', destination: '#solusi' },
        { label: 'Benefits', destination: '#benefits' },
        { label: 'FAQ', destination: '#faq' },
        { label: 'Kontak', destination: '#contact' },
      ],
    },
    sections: [
      {
        key: 'hero-section',
        type: 'hero',
        name: 'Hero Section',
        content: {
          badge: 'Company profile',
          titleHtml: 'Bangun kepercayaan dari halaman pertama',
          description:
            'Perkenalkan brand, layanan, dan alasan pelanggan perlu memilih bisnis Anda.',
          primaryCta: 'Hubungi Kami',
          secondaryCta: 'Lihat Layanan',
          primaryCtaUrl: '#contact',
          secondaryCtaUrl: '#solusi',
        },
        style: { renderer_component: 'HeroSection' },
      },
      {
        key: 'services-section',
        type: 'features',
        name: 'Services Section',
        content: {
          title: 'Layanan utama kami',
          description: 'Tampilkan layanan inti dalam format yang mudah dipindai.',
          services: [
            {
              icon: 'web',
              title: 'Website & Company Profile',
              desc: 'Profil digital yang rapi untuk memperkenalkan bisnis.',
            },
            {
              icon: 'dashboard',
              title: 'Dashboard Operasional',
              desc: 'Panel kerja untuk memantau proses dan data penting.',
            },
            {
              icon: 'campaign',
              title: 'Campaign Landing Page',
              desc: 'Halaman promosi yang fokus pada conversion.',
            },
          ],
        },
        style: { renderer_component: 'ServicesSection' },
      },
      {
        key: 'benefits-section',
        type: 'content',
        name: 'Benefits Section',
        content: {
          title: 'Kenapa memilih kami',
          description: 'Ringkas manfaat bisnis yang paling bernilai untuk calon pelanggan.',
          benefits: [
            {
              icon: 'rocket_launch',
              title: 'Cepat publish',
              desc: 'Mulai dari struktur siap pakai.',
            },
            {
              icon: 'verified',
              title: 'Terpercaya',
              desc: 'Bangun kredibilitas lewat narasi yang jelas.',
            },
            {
              icon: 'support_agent',
              title: 'Mudah dihubungi',
              desc: 'CTA dan kontak disiapkan sejak awal.',
            },
          ],
        },
        style: { renderer_component: 'BenefitsSection' },
      },
      {
        key: 'faq-section',
        type: 'faq',
        name: 'FAQ Section',
        content: {
          title: 'Pertanyaan umum',
          items: [
            {
              question: 'Apakah konten bisa disesuaikan?',
              answer: 'Bisa, setiap section bisa diedit setelah page dibuat.',
            },
            {
              question: 'Apakah template ini bisa dipublish langsung?',
              answer: 'Bisa setelah konten, SEO, dan branding dicek ulang.',
            },
          ],
        },
        style: { renderer_component: 'FaqSection' },
      },
      {
        key: 'cta-section',
        type: 'cta',
        name: 'CTA Section',
        content: {
          title: 'Siap mulai?',
          description: 'Diskusikan kebutuhan Anda dan kami bantu susun halaman yang tepat.',
          primaryButtonText: 'Hubungi Kami',
          secondaryButtonText: 'Lihat Detail',
          primaryUrl: '#contact',
          secondaryUrl: '#solusi',
        },
        style: { renderer_component: 'CtaSection' },
      },
    ],
    footer: {
      key: 'footer-section',
      type: 'footer',
      name: 'Footer Section',
      content: {},
      style: { renderer_component: 'LandingFooter' },
    },
    config: {
      locale: 'id-ID',
      timezone: 'Asia/Jakarta',
      layoutWidth: 'wide',
      spacing: 'comfortable',
      defaultMetaDescription:
        'Company profile profesional untuk memperkenalkan layanan, manfaat, dan kontak bisnis.',
    },
    branding: {
      company_name: 'Nama Perusahaan',
      tagline: 'Solusi digital untuk pertumbuhan bisnis',
      colors: { primary: '#0f172a', secondary: '#14b8a6', accent: '#38bdf8' },
      typography: { heading_font: 'Inter', body_font: 'Inter' },
      shape: { button_radius: '8px', card_radius: '12px' },
      layout: { width: 'wide', spacing: 'comfortable', header_style: 'sticky' },
    },
  },
  {
    key: 'saas-landing',
    name: 'SaaS Landing Template',
    category: 'saas',
    description:
      'Blueprint landing SaaS yang menonjolkan problem, solution, fitur, proof, pricing, dan CTA.',
    pageType: 'product_service',
    seoFocus: 'Use case, fitur produk, dan keyword konversi.',
    header: {
      menuName: 'SaaS Header',
      style: 'sticky transparent',
      ctaLabel: 'Coba Demo',
      ctaDestination: '#demo',
      items: [
        { label: 'Cara Kerja', destination: '#cara-kerja' },
        { label: 'Features', destination: '#features' },
        { label: 'Pricing', destination: '#pricing' },
        { label: 'FAQ', destination: '#faq' },
      ],
    },
    sections: [
      {
        key: 'hero-section',
        type: 'hero',
        name: 'Hero Section',
        content: {
          badge: 'SaaS platform',
          titleHtml: 'Sederhanakan operasional dalam satu dashboard',
          description: 'Tampilkan value proposition produk SaaS, use case utama, dan CTA demo.',
          primaryCta: 'Coba Demo',
          secondaryCta: 'Lihat Cara Kerja',
          primaryCtaUrl: '#demo',
          secondaryCtaUrl: '#cara-kerja',
        },
        style: { renderer_component: 'HeroSection' },
      },
      {
        key: 'problem-section',
        type: 'content',
        name: 'Problem Section',
        content: {
          title: 'Masalah yang sering memperlambat tim',
          description: 'Bantu pengunjung merasa dipahami sebelum masuk ke solusi produk.',
          cards: [
            {
              icon: 'sync_problem',
              bgClass: 'bg-primary-fixed/30',
              iconClass: 'text-secondary',
              title: 'Data terpisah',
              desc: 'Informasi tersebar di banyak tools.',
            },
            {
              icon: 'schedule',
              bgClass: 'bg-secondary-fixed/30',
              iconClass: 'text-secondary',
              title: 'Proses lambat',
              desc: 'Approval dan follow-up sulit dipantau.',
            },
            {
              icon: 'visibility_off',
              bgClass: 'bg-tertiary-fixed/30',
              iconClass: 'text-secondary',
              title: 'Minim insight',
              desc: 'Keputusan sering dibuat tanpa data real-time.',
            },
            {
              icon: 'paid',
              bgClass: 'bg-primary-fixed/30',
              iconClass: 'text-secondary',
              title: 'Biaya membesar',
              desc: 'Tool yang tidak terintegrasi menaikkan beban operasional.',
            },
          ],
        },
        style: { renderer_component: 'ProblemSection' },
      },
      {
        key: 'solution-section',
        type: 'services',
        name: 'Solution Section',
        content: {
          title: 'Cara produk ini membantu',
          description: 'Tunjukkan alur sederhana dari onboarding sampai hasil terukur.',
          ctaText: 'Jadwalkan Demo',
          ctaUrl: '#demo',
          steps: [
            {
              number: 1,
              title: 'Connect',
              desc: 'Hubungkan data dan workflow utama.',
              highlight: false,
            },
            {
              number: 2,
              title: 'Automate',
              desc: 'Otomatisasi proses repetitif.',
              highlight: true,
            },
            {
              number: 3,
              title: 'Measure',
              desc: 'Pantau performa dari dashboard.',
              highlight: false,
            },
          ],
        },
        style: { renderer_component: 'SolutionSection' },
      },
      {
        key: 'faq-section',
        type: 'faq',
        name: 'FAQ Section',
        content: {
          title: 'Pertanyaan SaaS',
          items: [
            {
              question: 'Apakah ada trial?',
              answer: 'Sesuaikan jawaban trial dengan penawaran produk.',
            },
            {
              question: 'Apakah data aman?',
              answer: 'Jelaskan standar keamanan dan pengelolaan akses.',
            },
          ],
        },
        style: { renderer_component: 'FaqSection' },
      },
      {
        key: 'cta-section',
        type: 'cta',
        name: 'CTA Section',
        content: {
          title: 'Mulai optimalkan workflow tim Anda',
          description: 'Arahkan calon pelanggan ke demo, trial, atau kontak sales.',
          primaryButtonText: 'Coba Demo',
          secondaryButtonText: 'Hubungi Sales',
          primaryUrl: '#demo',
          secondaryUrl: '#contact',
        },
        style: { renderer_component: 'CtaSection' },
      },
    ],
    footer: {
      key: 'footer-section',
      type: 'footer',
      name: 'Footer Section',
      content: {},
      style: { renderer_component: 'LandingFooter' },
    },
    config: {
      locale: 'id-ID',
      timezone: 'Asia/Jakarta',
      layoutWidth: 'wide',
      spacing: 'dense',
      defaultMetaDescription:
        'Landing page SaaS untuk menjelaskan problem, fitur, benefit, dan CTA demo produk.',
    },
    branding: {
      company_name: 'Nama Produk',
      tagline: 'Platform SaaS untuk operasional modern',
      colors: { primary: '#111827', secondary: '#06b6d4', accent: '#8b5cf6' },
      typography: { heading_font: 'Inter', body_font: 'Inter' },
      shape: { button_radius: '10px', card_radius: '14px' },
      layout: { width: 'wide', spacing: 'dense', header_style: 'transparent' },
    },
  },
]

export function getPageTemplateBlueprint(key: string) {
  return pageTemplateBlueprints.find((blueprint) => blueprint.key === key) ?? null
}
