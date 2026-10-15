import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import SaveAsTemplateDialog from './SaveAsTemplateDialog.vue'

type Submit = (v: Record<string, unknown>) => Promise<void>

function mountDialog(
  over: Partial<{
    mode: 'create' | 'edit'
    initial: Record<string, unknown>
    submit: Submit
  }> = {},
) {
  const submit = over.submit ?? vi.fn().mockResolvedValue(undefined)
  const w = mount(SaveAsTemplateDialog, {
    props: {
      open: true,
      mode: over.mode ?? 'create',
      initial: over.initial,
      submit: submit as never,
    },
    attachTo: document.body,
    global: { stubs: { Teleport: true } },
  })
  return { w, submit: submit as ReturnType<typeof vi.fn> }
}

const nameInput = (w: ReturnType<typeof mountDialog>['w']) => w.get('input[name="name"]')
const slugInput = (w: ReturnType<typeof mountDialog>['w']) => w.get('input[name="slug"]')

describe('SaveAsTemplateDialog', () => {
  it('slug otomatis mengikuti nama', async () => {
    const { w } = mountDialog()
    await nameInput(w).setValue('Klinik Sehat')
    expect((slugInput(w).element as HTMLInputElement).value).toBe('klinik-sehat')
  })

  it('setelah slug diedit manual, nama tidak lagi mengubah slug', async () => {
    const { w } = mountDialog()
    await nameInput(w).setValue('Klinik')
    await slugInput(w).setValue('klinik-khusus')
    await nameInput(w).setValue('Klinik Baru')
    expect((slugInput(w).element as HTMLInputElement).value).toBe('klinik-khusus')
  })

  it('slug invalid → pesan validasi dan submit tidak dipanggil', async () => {
    const { w, submit } = mountDialog()
    await nameInput(w).setValue('Klinik')
    await slugInput(w).setValue('Slug Salah!')
    await w.get('form').trigger('submit')
    expect(w.text()).toContain('Slug hanya huruf kecil, angka, dan tanda hubung (maks. 80).')
    expect(submit).not.toHaveBeenCalled()
  })

  it('mengirim nilai valid lalu menutup dialog', async () => {
    const { w, submit } = mountDialog()
    await nameInput(w).setValue('Klinik Sehat')
    await w.get('textarea[name="description"]').setValue('Template klinik')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(submit).toHaveBeenCalledWith({
      name: 'Klinik Sehat',
      slug: 'klinik-sehat',
      category: 'bisnis-jasa',
      description: 'Template klinik',
      sort_order: 100,
      platform_only: false,
    })
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('TEMPLATE_SLUG_TAKEN → pesan di field slug, dialog tetap terbuka, isian tetap', async () => {
    const submit = vi
      .fn()
      .mockRejectedValue({ response: { data: { code: 'TEMPLATE_SLUG_TAKEN' } } })
    const { w } = mountDialog({ submit })
    await nameInput(w).setValue('Klinik Sehat')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Slug sudah dipakai template lain.')
    expect(w.emitted('close')).toBeUndefined()
    expect((nameInput(w).element as HTMLInputElement).value).toBe('Klinik Sehat')
    expect((slugInput(w).element as HTMLInputElement).value).toBe('klinik-sehat')
  })

  it('error lain → pesan umum di dialog', async () => {
    const submit = vi.fn().mockRejectedValue({ response: { data: { message: 'Server error' } } })
    const { w } = mountDialog({ submit })
    await nameInput(w).setValue('Klinik')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('Server error')
  })

  it('mode create tidak menampilkan "Khusus platform"', () => {
    const { w } = mountDialog()
    expect(w.find('input[name="platform_only"]').exists()).toBe(false)
  })

  it('mode edit + locked → checkbox tercentang dan disabled', () => {
    const { w } = mountDialog({
      mode: 'edit',
      initial: { name: 'X', slug: 'x', platform_only: true, locked: true },
    })
    const box = w.get('input[name="platform_only"]')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    expect(box.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Terkunci: template memakai Pricing Katalog.')
  })
})
