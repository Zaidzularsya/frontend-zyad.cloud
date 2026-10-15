import { describe, expect, it } from 'vitest'
import { STANDARD_LEAD_FORM } from '../grapes/lead-form-presets'
import { buildTemplatePreviewChrome, PREVIEW_SAMPLE_PLANS, toChromePlans } from './preview-chrome'
import type { LandingPricingPlan } from '@/features/landing/shared/types/landing.types'

const base = {
  isPlatform: false,
  brand: { name: 'Klinik Sehat', logoUrl: '/logo.png' },
  nav: [{ label: 'Beranda', href: '/' }],
  footerNav: [{ label: 'Kontak', href: '#kontak' }],
  plans: [],
}

describe('toChromePlans', () => {
  it('memetakan field snake_case ke camelCase', () => {
    const plan = {
      id: 'p1',
      name: 'Pro',
      price_label: 'Rp 100.000',
      interval_label: '/bulan',
      description: 'd',
      features: ['a', 'b'],
      cta_label: 'Beli',
      cta_url: '/beli',
      is_featured: true,
    } as LandingPricingPlan
    expect(toChromePlans([plan])).toEqual([
      {
        id: 'p1',
        name: 'Pro',
        priceLabel: 'Rp 100.000',
        intervalLabel: '/bulan',
        description: 'd',
        features: ['a', 'b'],
        ctaLabel: 'Beli',
        ctaUrl: '/beli',
        isFeatured: true,
      },
    ])
  })
})

describe('buildTemplatePreviewChrome', () => {
  it('memakai paket contoh bila tenant belum punya paket', () => {
    expect(buildTemplatePreviewChrome(base).pricingPlans).toEqual(PREVIEW_SAMPLE_PLANS)
    expect(PREVIEW_SAMPLE_PLANS).toHaveLength(3)
    expect(PREVIEW_SAMPLE_PLANS.filter((p) => p.isFeatured).map((p) => p.name)).toEqual([
      'Paket Bisnis',
    ])
  })

  it('memakai paket tenant bila ada', () => {
    const plans = [{ ...PREVIEW_SAMPLE_PLANS[0]!, id: 'mine' }]
    expect(buildTemplatePreviewChrome({ ...base, plans }).pricingPlans).toEqual(plans)
  })

  it('fallback nama brand dan orgType', () => {
    const c = buildTemplatePreviewChrome({ ...base, brand: { name: '', logoUrl: '' } })
    expect(c.brand?.name).toBe('Nama Bisnis Anda')
    expect(c.footer?.brandName).toBe('Nama Bisnis Anda')
    expect(c.orgType).toBe('customer')
    expect(buildTemplatePreviewChrome({ ...base, isPlatform: true }).orgType).toBe('platform')
  })

  it('previewForm memakai field STANDARD_LEAD_FORM dan forms kosong', () => {
    const c = buildTemplatePreviewChrome(base)
    expect(c.forms).toEqual([])
    expect(c.previewForm?.id).toBe('preview')
    expect(c.previewForm?.fields.map((f) => f.key)).toEqual(
      STANDARD_LEAD_FORM.fields.map((f) => f.key),
    )
  })
})
