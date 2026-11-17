import type {
  GrapesChrome,
  GrapesChromeForm,
  GrapesChromeLink,
  GrapesChromePricingPlan,
} from '../../renderer/grapes/chrome'
import type { LandingPricingPlan } from '../../shared/types/landing.types'
import { LEAD_FORM_BASE, presetFields } from '../grapes/lead-form-presets'

const FALLBACK_BRAND = 'Nama Bisnis Anda'

/** Pemetaan sama dengan pricingPlans() di useGrapesChrome.ts, dari bentuk API admin. */
export function toChromePlans(plans: LandingPricingPlan[]): GrapesChromePricingPlan[] {
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    priceLabel: p.price_label,
    intervalLabel: p.interval_label,
    description: p.description,
    features: p.features,
    ctaLabel: p.cta_label,
    ctaUrl: p.cta_url,
    isFeatured: p.is_featured,
  }))
}

const samplePlan = (id: string, name: string, isFeatured: boolean): GrapesChromePricingPlan => ({
  id,
  name,
  priceLabel: 'Rp [harga]',
  intervalLabel: '/bulan',
  description: '[Deskripsi singkat paket]',
  features: ['[Fitur pertama]', '[Fitur kedua]', '[Fitur ketiga]'],
  ctaLabel: 'Pilih paket',
  isFeatured,
})

/** Dipakai thumbnail/preview saat tenant belum punya paket harga sendiri. */
export const PREVIEW_SAMPLE_PLANS: GrapesChromePricingPlan[] = [
  samplePlan('sample-dasar', 'Paket Dasar', false),
  samplePlan('sample-bisnis', 'Paket Bisnis', true),
  samplePlan('sample-pro', 'Paket Pro', false),
]

function previewForm(): GrapesChromeForm {
  return {
    id: 'preview',
    submitLabel: LEAD_FORM_BASE.submit_label,
    successMessage: '',
    redirectUrl: '',
    afterSubmit: 'message',
    whatsappNumber: '',
    whatsappMessage: '',
    fields: presetFields('ringkas').map((f) => ({
      key: f.key,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder ?? '',
      options: f.options ?? [],
      required: f.required ?? false,
    })),
  }
}

/** Chrome untuk thumbnail/preview template, memakai brand org yang sedang login. */
export function buildTemplatePreviewChrome(i: {
  isPlatform: boolean
  brand: { name: string; logoUrl: string }
  nav: GrapesChromeLink[]
  footerNav: GrapesChromeLink[]
  plans: GrapesChromePricingPlan[]
}): GrapesChrome {
  const name = i.brand.name.trim() || FALLBACK_BRAND
  return {
    orgType: i.isPlatform ? 'platform' : 'customer',
    nav: i.nav,
    brand: { name, logoUrl: i.brand.logoUrl },
    footer: {
      brandName: name,
      logoUrl: i.brand.logoUrl,
      columns: i.footerNav.length ? [{ title: 'Tautan', links: i.footerNav }] : [],
    },
    pricingPlans: i.plans.length ? i.plans : PREVIEW_SAMPLE_PLANS,
    forms: [],
    previewForm: previewForm(),
  }
}
