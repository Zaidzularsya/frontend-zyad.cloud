import type { KnownSectionType } from './section-types'

/**
 * Field input types supported by the schema-driven section content form
 * (SectionContentForm.vue). `image` currently renders as a URL input; a
 * contextual media-library picker replaces it in a later stage.
 */
export type SectionFieldType =
  | 'text'
  | 'richtext'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'image'
  | 'url'
  | 'repeater'

export interface SectionFieldSchema {
  /** JSON key inside section.content */
  key: string
  label: string
  type: SectionFieldType
  /** For 'select' fields. */
  options?: string[]
  /** For 'repeater' fields: the schema of each array item. */
  itemSchema?: SectionFieldSchema[]
  placeholder?: string
  required?: boolean
}

/**
 * Section-type-aware field schemas, replacing generic JSON-key reflection
 * with purpose-built forms per section type. Keyed off the backend's
 * persisted section-type vocabulary (landing_page_sections.section_type
 * check constraint), NOT the frontend's full KNOWN_SECTION_TYPES list —
 * `benefits`/`problem`/`solution`/`demo` are platform-marketing-only and
 * intentionally have no entry here.
 *
 * Coverage is intentionally incremental (highest-traffic types first).
 * Types without an entry fall back to the generic content-field reflection
 * in LandingPagesManagementPage.vue — see schemaForSectionType().
 */
export const SECTION_CONTENT_SCHEMAS: Partial<Record<KnownSectionType, SectionFieldSchema[]>> = {
  hero: [
    { key: 'badge', label: 'Badge text', type: 'text', placeholder: 'New · Now available' },
    { key: 'headline', label: 'Headline', type: 'text', required: true },
    { key: 'subheadline', label: 'Subheadline', type: 'richtext' },
    { key: 'body', label: 'Body copy', type: 'richtext' },
    { key: 'background_image', label: 'Background image URL', type: 'image' },
    { key: 'cta_id', label: 'Primary CTA (tracking key)', type: 'text' },
    { key: 'secondary_cta_id', label: 'Secondary CTA (tracking key)', type: 'text' },
  ],
  faq: [
    { key: 'headline', label: 'Headline', type: 'text' },
    { key: 'intro', label: 'Intro copy', type: 'richtext' },
    {
      key: 'items',
      label: 'Questions',
      type: 'repeater',
      itemSchema: [
        { key: 'question', label: 'Question', type: 'text', required: true },
        { key: 'answer', label: 'Answer', type: 'richtext' },
      ],
    },
  ],
  pricing: [
    { key: 'headline', label: 'Headline', type: 'text' },
    { key: 'intro', label: 'Intro copy', type: 'richtext' },
    {
      key: 'tiers',
      label: 'Pricing tiers',
      type: 'repeater',
      itemSchema: [
        { key: 'name', label: 'Plan name', type: 'text', required: true },
        { key: 'price', label: 'Price', type: 'text' },
        { key: 'period', label: 'Billing period', type: 'text', placeholder: '/month' },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'features',
          label: 'Features (one per line)',
          type: 'textarea',
        },
        { key: 'cta_id', label: 'CTA (tracking key)', type: 'text' },
        { key: 'highlighted', label: 'Highlighted plan', type: 'checkbox' },
      ],
    },
  ],
  content: [
    { key: 'headline', label: 'Headline', type: 'text' },
    { key: 'subheadline', label: 'Subheadline', type: 'text' },
    { key: 'body', label: 'Body copy', type: 'richtext' },
    { key: 'image', label: 'Image URL', type: 'image' },
  ],
  cta: [
    { key: 'headline', label: 'Headline', type: 'text', required: true },
    { key: 'body', label: 'Body copy', type: 'richtext' },
    { key: 'primary_cta_id', label: 'Primary CTA (tracking key)', type: 'text' },
    { key: 'secondary_cta_id', label: 'Secondary CTA (tracking key)', type: 'text' },
  ],
}

/**
 * Returns the field schema for a section type, or null if no schema has
 * been defined yet — callers should fall back to generic content reflection.
 */
export function schemaForSectionType(type: string): SectionFieldSchema[] | null {
  return SECTION_CONTENT_SCHEMAS[type as KnownSectionType] ?? null
}
