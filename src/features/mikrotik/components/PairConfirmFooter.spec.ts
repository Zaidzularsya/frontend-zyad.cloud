import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import PairConfirmFooter from '@/features/mikrotik/components/PairConfirmFooter.vue'
import PairResultModal from '@/features/mikrotik/components/PairResultModal.vue'

describe('PairConfirmFooter', () => {
  it('shows count text and an enabled confirm button', async () => {
    const w = mount(PairConfirmFooter, { props: { count: 3, total: 20 } })
    expect(w.text()).toContain('3 dari 20 baris dipilih')
    const btn = w.get('button')
    expect(btn.text()).toBe('Konfirmasi 3 Pasangan')
    expect(btn.attributes('disabled')).toBeUndefined()
    await btn.trigger('click')
    expect(w.emitted('confirm')).toHaveLength(1)
  })

  it('is disabled with the hint text when nothing is selected', () => {
    const w = mount(PairConfirmFooter, { props: { count: 0, total: 20 } })
    expect(w.text()).toContain('Pilih data untuk dipasangkan')
    expect(w.get('button').attributes('disabled')).toBeDefined()
    expect(w.classes()).toContain('sticky')
    expect(w.classes()).toContain('bottom-0')
  })
})

describe('PairResultModal', () => {
  it('shows success and failure counts with per-row reasons', () => {
    mount(PairResultModal, {
      props: {
        open: true,
        results: [
          { secret_id: 's1', ok: true, code: '', message: '' },
          { secret_id: 's2', ok: true, code: '', message: '' },
          {
            secret_id: 's3',
            ok: false,
            code: 'MIKROTIK_SECRET_ALREADY_PAIRED',
            message: 'sudah terpasang',
          },
        ],
        secretNames: { s3: 'andi' },
      },
      attachTo: document.body,
    })
    const text = document.body.textContent ?? ''
    expect(text).toContain('2 Pasangan Berhasil')
    expect(text).toContain('1 Pasangan Gagal')
    expect(text).toContain('andi')
    expect(text).toContain('sudah terpasang')
  })
})
