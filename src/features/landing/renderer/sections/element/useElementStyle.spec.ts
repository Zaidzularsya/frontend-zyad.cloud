import { describe, expect, it } from 'vitest'

import { useElementStyle } from './useElementStyle'

function styles(style: Record<string, unknown>) {
  return useElementStyle(() => style)
}

describe('useElementStyle — boxStyle', () => {
  it('maps radius, styled border, shadow and dimensions', () => {
    const { boxStyle } = styles({
      box: {
        radius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#123456',
        shadow: 'md',
        width: 480,
        height: 200,
        objectFit: 'cover',
      },
    })
    expect(boxStyle.value).toMatchObject({
      borderRadius: '12px',
      border: '2px dashed #123456',
      maxWidth: '480px',
      height: '200px',
      objectFit: 'cover',
    })
    expect(boxStyle.value.boxShadow).toContain('rgba')
  })

  it('fullWidth wins over width', () => {
    const { boxStyle } = styles({ box: { width: 300, fullWidth: true } })
    expect(boxStyle.value.width).toBe('100%')
    expect(boxStyle.value.maxWidth).toBeUndefined()
  })
})

describe('useElementStyle — layoutStyle', () => {
  it('is empty when no advanced-layout keys are set', () => {
    expect(styles({ box: { radius: 8 } }).layoutStyle.value).toEqual({})
  })

  it('a zIndex implies position: relative', () => {
    const { layoutStyle } = styles({ box: { zIndex: 10 } })
    expect(layoutStyle.value).toEqual({ position: 'relative', zIndex: 10 })
  })

  it('offsets become a translate transform and force relative positioning', () => {
    const { layoutStyle } = styles({ box: { offsetX: -20, offsetY: 40 } })
    expect(layoutStyle.value).toMatchObject({
      position: 'relative',
      transform: 'translate(-20px, 40px)',
    })
  })

  it('float passes through except "none"', () => {
    expect(styles({ box: { float: 'right' } }).layoutStyle.value.float).toBe('right')
    expect(styles({ box: { float: 'none' } }).layoutStyle.value.float).toBeUndefined()
  })

  it('an explicit position: relative alone is honoured', () => {
    expect(styles({ box: { position: 'relative' } }).layoutStyle.value).toEqual({
      position: 'relative',
    })
  })
})
