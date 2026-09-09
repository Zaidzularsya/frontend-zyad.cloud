import { computed, type CSSProperties } from 'vue'

/**
 * Shared style mapping for atomic element blocks (Headline / Paragraph / Button /
 * Image / Divider). Reads the `typography` and `box` maps from `section.style`
 * (allowlisted server-side in domain.AllowedStyleKeys) and turns them into inline
 * CSS. Every key is optional — an element with no style renders with plain
 * defaults.
 */

export interface TypographyStyle {
  size?: number
  weight?: string | number
  color?: string
  lineHeight?: number
  align?: 'left' | 'center' | 'right'
}

export interface BoxStyle {
  radius?: number
  borderWidth?: number
  borderColor?: string
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  /** Max width in px for the element itself (not the section wrapper). */
  width?: number
  fullWidth?: boolean
}

const SHADOW_PRESETS: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  md: '0 4px 12px rgba(15, 23, 42, 0.12)',
  lg: '0 12px 32px rgba(15, 23, 42, 0.18)',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function useElementStyle(styleConfig: () => Record<string, unknown> | undefined) {
  const typography = computed<TypographyStyle>(
    () => asRecord(styleConfig()?.typography) as TypographyStyle,
  )
  const box = computed<BoxStyle>(() => asRecord(styleConfig()?.box) as BoxStyle)

  const textStyle = computed<CSSProperties>(() => {
    const t = typography.value
    const out: CSSProperties = {}
    if (typeof t.size === 'number') out.fontSize = `${t.size}px`
    if (t.weight !== undefined && t.weight !== '') out.fontWeight = String(t.weight)
    if (typeof t.color === 'string' && t.color) out.color = t.color
    if (typeof t.lineHeight === 'number') out.lineHeight = String(t.lineHeight)
    if (t.align) out.textAlign = t.align
    return out
  })

  const boxStyle = computed<CSSProperties>(() => {
    const b = box.value
    const out: CSSProperties = {}
    if (typeof b.radius === 'number') out.borderRadius = `${b.radius}px`
    if (typeof b.borderWidth === 'number' && b.borderWidth > 0) {
      out.border = `${b.borderWidth}px solid ${b.borderColor || '#e2e8f0'}`
    }
    if (b.shadow && SHADOW_PRESETS[b.shadow]) out.boxShadow = SHADOW_PRESETS[b.shadow]
    if (b.fullWidth) {
      out.width = '100%'
    } else if (typeof b.width === 'number') {
      out.maxWidth = `${b.width}px`
    }
    return out
  })

  return { typography, box, textStyle, boxStyle }
}
