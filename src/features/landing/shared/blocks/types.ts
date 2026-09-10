import type { SectionFieldSchema } from '@/features/landing/shared/constants/section-schemas'
import type { KnownSectionType } from '@/features/landing/shared/constants/section-types'

/**
 * Palette grouping for the visual builder's block list.
 */
export type BlockGroup =
  | 'layout'
  | 'text'
  | 'media'
  | 'interactive'
  | 'section'
  | 'social-proof'
  | 'conversion'
  | 'navigation'

/** Broad taxonomy of a block, independent of its palette `group`. */
export type BlockKind = 'section' | 'element' | 'layout'

/**
 * A single insertable block in the visual builder.
 *
 * This is the ONE source of truth that replaces the three previously divergent
 * lists: the hardcoded `sectionPresets` in LandingContentManagementPage.vue,
 * `SECTION_CONTENT_SCHEMAS` in section-schemas.ts, and the component map in
 * renderer/registry/section-registry.ts.
 *
 * Invariants (enforced by catalog.spec.ts):
 * - `resolveSection(sectionType, variant)` must return a real component.
 * - every key in `schema` must exist in `defaultContent` (repeater keys hold [] ).
 * - `sectionType` must be a value the backend section_type CHECK accepts, i.e.
 *   one of the persisted types — NOT the frontend-only `benefits` / `problem` /
 *   `solution` / `demo`. Those render via `sectionType: 'content'` + a `variant`.
 */
export interface BlockDefinition {
  /** Stable catalog id, unique. e.g. `hero.default`, `content.benefits`. */
  id: string
  /** Persisted to landing_page_sections.section_type. */
  sectionType: KnownSectionType
  /** Renderer variant (section-registry key). `undefined` resolves to `default`. */
  variant?: string
  label: string
  description: string
  /** Material Symbols icon name shown in the palette. */
  icon: string
  group: BlockGroup
  /**
   * Taxonomy hint (see `blockKind()`): `section` = opinionated pre-config block,
   * `element` = atomic primitive, `layout` = structural primitive (grid/container).
   * Optional — derived from `variant` when absent.
   */
  kind?: BlockKind
  /**
   * Where a block's content comes from. `static` = user-edited content only;
   * `module` = (future) bound to a backend module named by `moduleKey`.
   */
  dataSource?: 'static' | 'module'
  /** Reserved: module binding key for `dataSource: 'module'`, e.g. `billing.plans`. */
  moduleKey?: string
  /** Prefix for generated section_key values, e.g. `hero` -> `hero-1`. */
  keyPrefix: string
  /** Seed `content` on insert. Keys MUST match what the renderer component reads. */
  defaultContent: Record<string, unknown>
  /** Seed `style` on insert (e.g. `{ variant }` for footer / content sub-variants). */
  defaultStyle: Record<string, unknown>
  /** Property-panel field schema, keyed to `defaultContent` keys. */
  schema: SectionFieldSchema[]
}
