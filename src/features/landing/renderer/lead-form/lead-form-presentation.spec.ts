import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PRESENTATION,
  presentationStyle,
  readLeadFormPresentation,
  supportsColumns,
  withFormId,
  writeLeadFormPresentation,
  type LeadFormPresentation,
} from './lead-form-presentation'

describe('readLeadFormPresentation', () => {
  it('returns defaults for undefined, "{}", and invalid JSON', () => {
    for (const raw of [undefined, '', '{}', '{', 'null', '[]', '"x"']) {
      expect(readLeadFormPresentation(raw)).toEqual(DEFAULT_PRESENTATION)
    }
  })

  it('reads legacy {"form_id":"f1"} as kartu/inline with form id', () => {
    expect(readLeadFormPresentation('{"form_id":"f1"}')).toEqual({
      ...DEFAULT_PRESENTATION,
      formId: 'f1',
    })
  })

  it('rejects non-hex colors including injection attempts', () => {
    for (const bad of ['red;background:url(//x)', '#fff', 'rgb(0,0,0)', '#12345g', 5, null]) {
      const p = readLeadFormPresentation(
        JSON.stringify({ accent: bad, background: bad, text: bad }),
      )
      expect([p.accent, p.background, p.text]).toEqual([null, null, null])
    }
    expect(readLeadFormPresentation('{"accent":"#AABBCC"}').accent).toBe('#aabbcc')
  })

  it('falls back on unknown enums and columns other than 1|2', () => {
    const p = readLeadFormPresentation(
      JSON.stringify({ style: 'neon', display: 'fullscreen', radius: 'xl', columns: 3 }),
    )
    expect([p.style, p.display, p.radius, p.columns]).toEqual(['kartu', 'inline', 'page', 2])
    expect(readLeadFormPresentation('{"columns":1}').columns).toBe(1)
    expect(readLeadFormPresentation('{"style":"split","display":"popup"}')).toMatchObject({
      style: 'split',
      display: 'popup',
    })
  })

  it('truncates split title/points and keeps at most 3 points', () => {
    const p = readLeadFormPresentation(
      JSON.stringify({
        split: {
          title: 'T'.repeat(100),
          points: ['a', '  ', 'b'.repeat(80), 'c', 'd', 5],
        },
      }),
    )
    expect(p.split.title).toHaveLength(80)
    expect(p.split.points).toEqual(['a', 'b'.repeat(60), 'c'])
  })

  it('limits popup texts and falls back for empty or unknown values', () => {
    const p = readLeadFormPresentation(
      JSON.stringify({
        popup: { label: 'L'.repeat(50), icon: 'x', position: 'top', title: '   ' },
      }),
    )
    expect(p.popup).toEqual({
      label: 'L'.repeat(30),
      icon: 'chat',
      position: 'right',
      title: 'Hubungi kami',
    })
  })

  it('treats a non-boolean inherit_font as the default (true)', () => {
    expect(readLeadFormPresentation('{"inherit_font":"no"}').inheritFont).toBe(true)
    expect(readLeadFormPresentation('{"inherit_font":false}').inheritFont).toBe(false)
  })
})

describe('write / withFormId', () => {
  it('write -> read round-trips every field', () => {
    const p: LeadFormPresentation = {
      formId: 'f9',
      style: 'split',
      display: 'popup',
      accent: '#1f6f5c',
      background: '#ffffff',
      text: '#111111',
      radius: 'lg',
      columns: 1,
      inheritFont: false,
      split: { title: 'Konsultasi gratis', points: ['Cepat', 'Gratis'] },
      popup: { label: 'Chat', icon: 'whatsapp', position: 'left', title: 'Halo' },
    }
    expect(readLeadFormPresentation(writeLeadFormPresentation(p))).toEqual(p)
  })

  it('withFormId keeps presentation', () => {
    const raw = writeLeadFormPresentation({
      ...DEFAULT_PRESENTATION,
      formId: 'old',
      style: 'glass',
      accent: '#112233',
    })
    expect(readLeadFormPresentation(withFormId(raw, 'new'))).toMatchObject({
      formId: 'new',
      style: 'glass',
      accent: '#112233',
    })
    expect(readLeadFormPresentation(withFormId(undefined, 'x'))).toEqual({
      ...DEFAULT_PRESENTATION,
      formId: 'x',
    })
  })
})

describe('presentationStyle', () => {
  it('only emits custom variables', () => {
    expect(presentationStyle(DEFAULT_PRESENTATION)).toEqual({})
    expect(
      presentationStyle({
        ...DEFAULT_PRESENTATION,
        accent: '#ef9f27',
        background: '#fafafa',
        text: '#222222',
        radius: 'sm',
        inheritFont: false,
      }),
    ).toEqual({
      '--zy-lf-accent-custom': '#ef9f27',
      '--zy-lf-on-accent-custom': '#111111',
      '--zy-lf-bg-custom': '#fafafa',
      '--zy-lf-fg-custom': '#222222',
      '--zy-lf-radius-custom': '6px',
      'font-family': "'Inter', 'Segoe UI', system-ui, sans-serif",
    })
  })
})

describe('supportsColumns', () => {
  it('is true for kartu/minimal/glass only', () => {
    expect(
      ['kartu', 'minimal', 'glass', 'split', 'inline'].map((s) => supportsColumns(s as never)),
    ).toEqual([true, true, true, false, false])
  })
})
