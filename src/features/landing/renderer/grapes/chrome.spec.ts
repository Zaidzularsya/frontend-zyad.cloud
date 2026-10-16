import { describe, expect, it } from 'vitest'

import type { LandingFormWithFields } from '../../shared/types/landing.types'
import { chromeFormFromAdmin, readHeaderPresentation, safeHref } from './chrome'

describe('readHeaderPresentation', () => {
  it('returns defaults for null / invalid JSON', () => {
    for (const raw of [null, '{bad']) {
      const p = readHeaderPresentation(raw)
      expect(p).toMatchObject({
        position: 'sticky',
        variant: 'solid',
        layout: 'grouped',
        groupAlign: 'left',
        container: true,
        showAction: true,
        actionLabel: 'Masuk',
        actionUrl: '/login',
        hideOnScroll: false,
        brandColor: '#0f172a',
        navColor: '#475569',
      })
    }
  })
  it('migrates legacy sticky/align', () => {
    const p = readHeaderPresentation('{"sticky":false,"align":"center"}')
    expect(p.position).toBe('static')
    expect(p.groupAlign).toBe('center')
  })
  it('rejects unsafe colors', () => {
    expect(readHeaderPresentation('{"brandColor":"red;background:url(x)"}').brandColor).toBe(
      '#0f172a',
    )
  })
})

describe('safeHref', () => {
  it.each([
    ['javascript:alert(1)', '#'],
    ['//evil.test', '#'],
    ['/harga', '/harga'],
    ['#harga', '#harga'],
    ['https://a.id', 'https://a.id'],
    ['', '#'],
  ])('%s → %s', (i, o) => {
    expect(safeHref(i)).toBe(o)
  })
})

describe('chromeFormFromAdmin', () => {
  const admin = {
    id: 'f1',
    submit_label: 'Kirim',
    success_message: 'Terima kasih',
    redirect_url: 'javascript:alert(1)',
    after_submit: 'whatsapp',
    whatsapp_number: '6281234567890',
    whatsapp_message: null,
    fields: [
      { key: 'email', type: 'email', label: 'Email', required: true, sort_order: 2 },
      { key: 'interest', type: 'hidden', label: 'Minat', required: false, sort_order: 3 },
      { key: 'name', type: 'text', label: 'Nama', required: true, sort_order: 1, placeholder: 'x' },
    ],
  } as unknown as LandingFormWithFields

  it('sorts fields and maps hidden/afterSubmit', () => {
    const form = chromeFormFromAdmin(admin)
    expect(form.fields.map((f) => f.key)).toEqual(['name', 'email', 'interest'])
    expect(form.fields[2]!.type).toBe('hidden')
    expect(form.fields[0]).toMatchObject({ placeholder: 'x', options: [], required: true })
    expect(form).toMatchObject({
      id: 'f1',
      submitLabel: 'Kirim',
      successMessage: 'Terima kasih',
      afterSubmit: 'whatsapp',
      whatsappNumber: '6281234567890',
      whatsappMessage: '',
    })
  })

  it('drops unsafe redirect urls and keeps safe ones', () => {
    expect(chromeFormFromAdmin(admin).redirectUrl).toBe('')
    expect(
      chromeFormFromAdmin({ ...admin, redirect_url: '/terima-kasih' } as LandingFormWithFields)
        .redirectUrl,
    ).toBe('/terima-kasih')
  })
})
