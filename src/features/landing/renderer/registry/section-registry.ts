// FROZEN — section registry for the legacy section builder + section renderer
// (page.builder === 'sections'). Still shipped so pre-pivot pages render and
// stay editable; new pages use GrapesJS (raw HTML/CSS, no section types).
import type { Component } from 'vue'
import HeroSection from '../sections/hero/HeroSection.vue'
import ThreeJSHero from '../sections/hero/ThreeJSHero.vue'
import BenefitsSection from '../sections/benefits/BenefitsSection.vue'
import CtaSection from '../sections/cta/CtaSection.vue'
import DemoSection from '../sections/demo/DemoSection.vue'
import EnterpriseTemplateSection from '../sections/enterprise/EnterpriseTemplateSection.vue'
import FaqSection from '../sections/faq/FaqSection.vue'
import LandingFooter from '../sections/footer/LandingFooter.vue'
import FooterSimple from '../sections/footer/FooterSimple.vue'
import FooterNewsletter from '../sections/footer/FooterNewsletter.vue'
import FooterMega from '../sections/footer/FooterMega.vue'
import ProblemSection from '../sections/problem/ProblemSection.vue'
import PricingSection from '../sections/pricing/PricingSection.vue'
import ServicesSection from '../sections/services/ServicesSection.vue'
import SolutionSection from '../sections/solution/SolutionSection.vue'
import StatisticsSection from '../sections/statistics/StatisticsSection.vue'
import TrustStripSection from '../sections/trust/TrustStripSection.vue'
import ElementHeadline from '../sections/element/ElementHeadline.vue'
import ElementParagraph from '../sections/element/ElementParagraph.vue'
import ElementButton from '../sections/element/ElementButton.vue'
import ElementButtonGroup from '../sections/element/ElementButtonGroup.vue'
import ElementSocialButtons from '../sections/element/ElementSocialButtons.vue'
import ElementImage from '../sections/element/ElementImage.vue'
import ElementDivider from '../sections/element/ElementDivider.vue'
import ElementContainer from '../sections/element/ElementContainer.vue'
import ElementGrid from '../sections/element/ElementGrid.vue'
import HeaderSection from '../sections/header/HeaderSection.vue'

const enterpriseTemplateVariants = new Set([
  'software_command',
  'ai_workflow',
  'cloud_architecture',
  'security_trust',
  'fintech_checkout',
  'banking_mobile',
  'insurance_claims',
  'clinic_booking',
  'telemedicine_app',
  'academy_cohort',
  'corporate_learning',
  'property_editorial',
  'property_dashboard',
  'resort_immersive',
  'restaurant_editorial',
  'commerce_product',
  'retail_operations',
  'fleet_map',
  'factory_control',
  'construction_progress',
  'legal_authority',
  'finance_advisory',
  'talent_pipeline',
  'event_summit',
  'agency_portfolio',
  'startup_pitch',
  'impact_campaign',
  'community_membership',
  'broadband_network',
  'managed_network',
  'pos_checkout',
  'company_profile',
])

/**
 * Section registry untuk renderer.
 * Struktur: { [sectionType]: { [variant]: Component } }
 *
 * Untuk menambah section type atau variant baru:
 * 1. Buat file component baru di renderer/sections/<type>/<name>.vue
 * 2. Import di sini
 * 3. Tambahkan ke registry di bawah
 */
export const sectionRegistry: Record<string, Record<string, Component>> = {
  hero: {
    default: HeroSection,
    enterprise: EnterpriseTemplateSection,
    HeroSection,
    ThreeJSHero,
    three_js: ThreeJSHero,
    threejs: ThreeJSHero,
  },
  benefits: {
    default: BenefitsSection,
    BenefitsSection,
  },
  cta: {
    default: CtaSection,
    enterprise: EnterpriseTemplateSection,
    CtaSection,
  },
  demo: {
    default: DemoSection,
    DemoSection,
  },
  portfolio: {
    default: DemoSection,
    DemoSection,
  },
  faq: {
    default: FaqSection,
    enterprise: EnterpriseTemplateSection,
    FaqSection,
  },
  partner_logos: {
    default: TrustStripSection,
    enterprise: EnterpriseTemplateSection,
    TrustStripSection,
  },
  pricing: {
    default: PricingSection,
    enterprise: EnterpriseTemplateSection,
    PricingSection,
  },
  statistics: {
    default: StatisticsSection,
    enterprise: EnterpriseTemplateSection,
    StatisticsSection,
  },
  header: {
    default: HeaderSection,
    HeaderSection,
  },
  footer: {
    default: LandingFooter,
    LandingFooter,
    simple: FooterSimple,
    newsletter: FooterNewsletter,
    mega: FooterMega,
  },
  problem: {
    default: ProblemSection,
    ProblemSection,
  },
  /**
   * 'content' adalah section type generik dari backend.
   * Default fallback ke ProblemSection; bisa dioverride lewat variant.
   */
  content: {
    default: ProblemSection,
    BenefitsSection,
    ProblemSection,
    SolutionSection,
    benefits: BenefitsSection,
    problem: ProblemSection,
    solution: SolutionSection,
    // Atomic element blocks (visual builder "Komponen" palette group).
    'element.headline': ElementHeadline,
    'element.paragraph': ElementParagraph,
    'element.button': ElementButton,
    'element.buttonGroup': ElementButtonGroup,
    'element.buttonList': ElementButtonGroup,
    'element.socialButtons': ElementSocialButtons,
    'element.image': ElementImage,
    'element.divider': ElementDivider,
    'element.container': ElementContainer,
    'element.grid': ElementGrid,
  },
  services: {
    default: ServicesSection,
    enterprise: EnterpriseTemplateSection,
    ServicesSection,
    SolutionSection,
  },
  /**
   * 'features' adalah alias untuk 'services' dari backend legacy.
   */
  features: {
    default: ServicesSection,
    enterprise: EnterpriseTemplateSection,
    BenefitsSection,
    ServicesSection,
  },
  solution: {
    default: SolutionSection,
    SolutionSection,
  },
}

/**
 * Resolve component dari registry berdasarkan section type dan variant.
 * Fallback: variant -> 'default' -> null
 */
export function resolveSection(type: string, variant?: string): Component | null {
  const typeRegistry = sectionRegistry[type]
  if (!typeRegistry) return null

  const variantKey = variant ?? 'default'
  if (typeRegistry[variantKey]) return typeRegistry[variantKey]
  if (enterpriseTemplateVariants.has(variantKey) && typeRegistry['enterprise']) {
    return typeRegistry['enterprise']
  }
  return typeRegistry['default'] ?? null
}

/**
 * Resolve component dari registry dengan fallback ke key-based lookup.
 * Ini untuk backward compat dengan `sectionComponentByKey` di MarketingLandingPage.
 */
export const sectionRegistryByKey: Record<string, Component> = {
  'hero-section': HeroSection,
  'problem-section': ProblemSection,
  'solution-section': SolutionSection,
  'services-section': ServicesSection,
  'benefits-section': BenefitsSection,
  'demo-section': DemoSection,
  'faq-section': FaqSection,
  'cta-section': CtaSection,
  'footer-section': LandingFooter,
}
