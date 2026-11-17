import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import { readLeadFormPresentation } from '../../renderer/lead-form/lead-form-presentation'
import GrapesLeadFormAppearance from './GrapesLeadFormAppearance.vue'

function setup(initial = '{"form_id":"f1"}') {
  let config = initial
  const addAttributes = vi.fn((attrs: Record<string, string>) => {
    config = attrs['data-zyad-config']!
  })
  const component = { getAttributes: () => ({ 'data-zyad-config': config }), addAttributes }
  const wrapper = mount(GrapesLeadFormAppearance, { props: { component } })
  return { wrapper, addAttributes, current: () => readLeadFormPresentation(config) }
}

describe('GrapesLeadFormAppearance', () => {
  it('selecting a style writes it while keeping form_id', async () => {
    const { wrapper, current } = setup('{"form_id":"f1","accent":"#112233"}')
    await wrapper.get('[data-style="glass"]').trigger('click')
    expect(current()).toMatchObject({ formId: 'f1', style: 'glass', accent: '#112233' })
    expect(wrapper.get('[data-style="glass"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-style="kartu"]').attributes('aria-checked')).toBe('false')
  })

  it('offers all five styles in a radiogroup', () => {
    const { wrapper } = setup()
    expect(
      wrapper.get('[role="radiogroup"][aria-label="Gaya"]').findAll('[role="radio"]'),
    ).toHaveLength(5)
  })

  it('hides the columns control for split and inline', async () => {
    const { wrapper } = setup()
    expect(wrapper.find('[data-columns]').exists()).toBe(true)
    await wrapper.get('[data-style="split"]').trigger('click')
    expect(wrapper.find('[data-columns]').exists()).toBe(false)
    await wrapper.get('[data-style="inline"]').trigger('click')
    expect(wrapper.find('[data-columns]').exists()).toBe(false)
    await wrapper.get('[data-style="minimal"]').trigger('click')
    expect(wrapper.find('[data-columns]').exists()).toBe(true)
  })

  it('writes columns', async () => {
    const { wrapper, current } = setup()
    await wrapper.get('[data-columns="1"]').trigger('click')
    expect(current().columns).toBe(1)
  })

  it('switching accent back to "Ikut halaman" writes accent null', async () => {
    const { wrapper, current } = setup()
    await wrapper.get('[data-accent-mode="custom"]').trigger('click')
    expect(current().accent).not.toBeNull()
    await wrapper.get('input[aria-label="Warna aksen"]').setValue('#1f6f5c')
    expect(current().accent).toBe('#1f6f5c')
    await wrapper.get('[data-accent-mode="page"]').trigger('click')
    expect(current().accent).toBeNull()
    expect(wrapper.find('input[aria-label="Warna aksen"]').exists()).toBe(false)
  })

  it('writes custom background and text colors and returns to automatic', async () => {
    const { wrapper, current } = setup()
    await wrapper.get('[data-colors-mode="custom"]').trigger('click')
    await wrapper.get('input[aria-label="Warna latar"]').setValue('#fafafa')
    await wrapper.get('input[aria-label="Warna teks"]').setValue('#222222')
    expect(current()).toMatchObject({ background: '#fafafa', text: '#222222' })
    await wrapper.get('[data-colors-mode="auto"]').trigger('click')
    expect(current()).toMatchObject({ background: null, text: null })
  })

  it('shows the low-contrast warning for #ffff00 text on #ffffff background', async () => {
    const { wrapper } = setup()
    expect(wrapper.text()).not.toContain('Kontras rendah, teks bisa sulit dibaca.')
    await wrapper.get('[data-colors-mode="custom"]').trigger('click')
    await wrapper.get('input[aria-label="Warna latar"]').setValue('#ffffff')
    await wrapper.get('input[aria-label="Warna teks"]').setValue('#ffff00')
    expect(wrapper.text()).toContain('Kontras rendah, teks bisa sulit dibaca.')
    await wrapper.get('input[aria-label="Warna teks"]').setValue('#111111')
    expect(wrapper.text()).not.toContain('Kontras rendah, teks bisa sulit dibaca.')
  })

  it('writes radius, display and the inherit-font toggle', async () => {
    const { wrapper, current } = setup()
    await wrapper.get('[data-radius="lg"]').trigger('click')
    await wrapper.get('[data-display="popup"]').trigger('click')
    await wrapper.get('input[aria-label="Ikut font halaman"]').setValue(false)
    expect(current()).toMatchObject({ radius: 'lg', display: 'popup', inheritFont: false })
  })

  it('saves split title and non-empty points only', async () => {
    const { wrapper, current } = setup('{"form_id":"f1","style":"split"}')
    await wrapper.get('input[aria-label="Judul"]').setValue('Konsultasi gratis')
    const points = wrapper.findAll('input[aria-label^="Poin"]')
    expect(points).toHaveLength(3)
    await points[0]!.setValue('Cepat')
    await points[1]!.setValue('   ')
    await points[2]!.setValue('Tanpa biaya')
    expect(current().split).toEqual({
      title: 'Konsultasi gratis',
      points: ['Cepat', 'Tanpa biaya'],
    })
  })

  it('hides split inputs for other styles', () => {
    expect(setup().wrapper.find('input[aria-label="Judul"]').exists()).toBe(false)
  })

  it('always shows the "saved with page" note', () => {
    expect(setup().wrapper.text()).toContain('Tampilan tersimpan bersama halaman.')
  })

  it('shows popup settings only in popup mode', async () => {
    const { wrapper } = setup()
    expect(wrapper.find('input[aria-label="Teks launcher"]').exists()).toBe(false)
    await wrapper.get('[data-display="popup"]').trigger('click')
    expect(wrapper.find('input[aria-label="Teks launcher"]').exists()).toBe(true)
    await wrapper.get('[data-display="inline"]').trigger('click')
    expect(wrapper.find('input[aria-label="Teks launcher"]').exists()).toBe(false)
  })

  it('writes launcher label, icon, position and title into data-zyad-config', async () => {
    const { wrapper, current } = setup('{"form_id":"f1","display":"popup"}')
    expect(
      (wrapper.get('input[aria-label="Teks launcher"]').element as HTMLInputElement).value,
    ).toBe('Konsultasi gratis')
    await wrapper.get('input[aria-label="Teks launcher"]').setValue('Chat kami')
    await wrapper.get('[data-popup-icon="whatsapp"]').trigger('click')
    await wrapper.get('[data-popup-position="left"]').trigger('click')
    await wrapper.get('input[aria-label="Judul popup"]').setValue('Tanya apa saja')
    expect(current().popup).toEqual({
      label: 'Chat kami',
      icon: 'whatsapp',
      position: 'left',
      title: 'Tanya apa saja',
    })
    expect(current().formId).toBe('f1')
  })
})
