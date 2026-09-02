import { describe, expect, it } from 'vitest'

import { resolveSection } from '@/features/landing/renderer/registry/section-registry'
import {
  BLOCK_CATALOG,
  blockById,
  blocksByGroup,
  defaultBlockForType,
  resolveBlockForSection,
} from './catalog'

// Types the backend section_type CHECK constraint does NOT accept — a block
// must never persist one of these (they render via sectionType 'content' + variant).
const FRONTEND_ONLY_TYPES = ['benefits', 'problem', 'solution', 'demo']

describe('BLOCK_CATALOG integrity', () => {
  it('has unique block ids', () => {
    const ids = BLOCK_CATALOG.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never uses a frontend-only section type', () => {
    for (const block of BLOCK_CATALOG) {
      expect(FRONTEND_ONLY_TYPES).not.toContain(block.sectionType)
    }
  })

  it('every block resolves to a real renderer component', () => {
    for (const block of BLOCK_CATALOG) {
      expect(resolveSection(block.sectionType, block.variant), block.id).toBeTruthy()
    }
  })

  it('every schema field key exists in defaultContent', () => {
    for (const block of BLOCK_CATALOG) {
      for (const field of block.schema) {
        expect(
          Object.prototype.hasOwnProperty.call(block.defaultContent, field.key),
          `${block.id}.${field.key}`,
        ).toBe(true)
        if (field.type === 'repeater') {
          expect(
            Array.isArray(block.defaultContent[field.key]),
            `${block.id}.${field.key} must seed an array`,
          ).toBe(true)
        }
      }
    }
  })

  it('blockById round-trips', () => {
    for (const block of BLOCK_CATALOG) {
      expect(blockById(block.id)).toBe(block)
    }
    expect(blockById('nope.nope')).toBeUndefined()
  })

  it('blocksByGroup covers every block exactly once', () => {
    const grouped = blocksByGroup().flatMap((g) => g.blocks)
    expect(grouped).toHaveLength(BLOCK_CATALOG.length)
    expect(new Set(grouped.map((b) => b.id)).size).toBe(BLOCK_CATALOG.length)
  })

  it('resolveBlockForSection recovers the block from its own seed', () => {
    for (const block of BLOCK_CATALOG) {
      const section = {
        type: block.sectionType,
        style: block.defaultStyle,
        variant: block.variant,
      }
      expect(resolveBlockForSection(section)?.id, block.id).toBe(block.id)
    }
  })

  it('resolveBlockForSection falls back to the type default for an unknown variant', () => {
    const resolved = resolveBlockForSection({
      type: 'hero',
      style: { variant: 'totally-unknown' },
      variant: undefined,
    })
    expect(resolved?.id).toBe('hero.default')
  })

  it('defaultBlockForType returns a block for every renderer-backed type in the catalog', () => {
    for (const type of new Set(BLOCK_CATALOG.map((b) => b.sectionType))) {
      expect(defaultBlockForType(type), type).toBeTruthy()
    }
  })
})
