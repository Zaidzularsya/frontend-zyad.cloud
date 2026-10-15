import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { PageTemplateSummary } from '@/features/landing/shared/types/page-template.types'
import TemplatePreviewPane from './TemplatePreviewPane.vue'

const template: PageTemplateSummary = {
  id: 't1',
  slug: 'klinik',
  name: 'Klinik',
  description: '',
  category: 'kesehatan',
  sort_order: 1,
  platform_only: false,
  updated_at: '',
}

describe('TemplatePreviewPane', () => {
  it('iframe menunjuk ke route preview dan lebar default Desktop 1280', () => {
    const w = mount(TemplatePreviewPane, { props: { template } })
    const iframe = w.get('iframe')
    expect(iframe.attributes('src')).toBe('/landing-template-preview/t1')
    expect(iframe.attributes('title')).toBe('Klinik')
    expect(iframe.attributes('style')).toContain('width: 1280px')
  })

  it('toggle Mobile mengubah lebar iframe jadi 375px, Tablet 768px', async () => {
    const w = mount(TemplatePreviewPane, { props: { template } })
    const button = (label: string) => w.findAll('button').find((b) => b.text() === label)!
    await button('Mobile').trigger('click')
    expect(w.get('iframe').attributes('style')).toContain('width: 375px')
    await button('Tablet').trigger('click')
    expect(w.get('iframe').attributes('style')).toContain('width: 768px')
  })

  it('actionLabel kosong → tidak ada tombol aksi', () => {
    const w = mount(TemplatePreviewPane, { props: { template, actionLabel: '' } })
    expect(w.text()).not.toContain('Gunakan template ini')
  })

  it('klik tombol aksi mengirim use; back mengirim back', async () => {
    const w = mount(TemplatePreviewPane, { props: { template } })
    await w
      .findAll('button')
      .find((b) => b.text() === 'Gunakan template ini')!
      .trigger('click')
    expect(w.emitted('use')?.[0]).toEqual([template])
    await w
      .findAll('button')
      .find((b) => b.text().includes('Kembali'))!
      .trigger('click')
    expect(w.emitted('back')).toHaveLength(1)
  })

  it('busy menonaktifkan tombol aksi', () => {
    const w = mount(TemplatePreviewPane, { props: { template, busy: true } })
    const btn = w.findAll('button').find((b) => b.text() === 'Gunakan template ini')!
    expect(btn.attributes('disabled')).toBeDefined()
  })
})
