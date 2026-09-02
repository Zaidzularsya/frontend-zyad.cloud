/**
 * Field-schema contract for the visual builder's property panel / content form.
 *
 * The per-block field schemas themselves now live in the block catalog
 * (`shared/blocks/catalog.ts` → `BlockDefinition.schema`), resolved per section
 * via `resolveBlockForSection()`. This file only owns the shared types.
 *
 * Field types:
 * - `image` is a plain URL input; `media` is the contextual media-library
 *   picker (added when a block/renderer actually consumes it).
 * - `cta` picks a reusable CTA (landing_ctas).
 * - `color`, `spacing`, `align` drive the Style tab of the property panel.
 */
export type SectionFieldType =
  | 'text'
  | 'richtext'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'image'
  | 'media'
  | 'url'
  | 'cta'
  | 'color'
  | 'spacing'
  | 'align'
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
