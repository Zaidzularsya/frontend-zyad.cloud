import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import InvoiceSendHistory from './InvoiceSendHistory.vue'
import { retryableSendIds } from '@/features/receivable/utils/send-invoice'

const send = (over: Record<string, unknown>) => ({
  id: 's',
  invoice_id: 'i1',
  channel: 'email',
  recipient: 'budi@example.com',
  status: 'sent',
  error: '',
  trigger: 'auto',
  sent_by: null,
  sent_by_name: '',
  sent_at: '2026-10-05T03:00:00Z',
  ...over,
})

describe('retryableSendIds', () => {
  it('a failed send is retryable until a later success on the same channel', () => {
    const sends = [
      send({ id: 'new-ok', channel: 'email', status: 'sent', sent_at: '2026-10-05T04:00:00Z' }),
      send({
        id: 'old-fail-email',
        channel: 'email',
        status: 'failed',
        sent_at: '2026-10-05T03:00:00Z',
      }),
      send({
        id: 'old-fail-wa',
        channel: 'whatsapp',
        status: 'failed',
        sent_at: '2026-10-05T03:00:00Z',
      }),
    ] as never
    expect(retryableSendIds(sends)).toEqual(new Set(['old-fail-wa']))
  })

  it('a failure with no later success is retryable', () => {
    expect(retryableSendIds([send({ id: 'f', status: 'failed' })] as never)).toEqual(new Set(['f']))
  })
})

describe('InvoiceSendHistory', () => {
  it('shows status, reason and a Retry button for an unresolved failure', async () => {
    const w = mount(InvoiceSendHistory, {
      props: {
        sends: [
          send({ id: 'f1', channel: 'whatsapp', status: 'failed', error: 'Belum ada pengirim.' }),
        ] as never,
        canRetry: true,
      },
    })
    expect(w.text()).toContain('Gagal')
    expect(w.text()).toContain('Belum ada pengirim.')
    const retry = w.findAll('button').find((b) => b.text() === 'Retry')
    expect(retry).toBeTruthy()
    await retry!.trigger('click')
    expect(w.emitted('retry')?.[0]).toEqual(['whatsapp'])
  })

  it('hides Retry without permission and for resolved failures', () => {
    const noPerm = mount(InvoiceSendHistory, {
      props: {
        sends: [send({ id: 'f1', status: 'failed', error: 'x' })] as never,
        canRetry: false,
      },
    })
    expect(noPerm.findAll('button')).toHaveLength(0)
    const resolved = mount(InvoiceSendHistory, {
      props: {
        sends: [
          send({ id: 'ok', status: 'sent', sent_at: '2026-10-05T04:00:00Z' }),
          send({ id: 'f1', status: 'failed', error: 'x' }),
        ] as never,
        canRetry: true,
      },
    })
    expect(resolved.findAll('button')).toHaveLength(0)
  })

  it('says so when nothing was sent yet', () => {
    const w = mount(InvoiceSendHistory, { props: { sends: [], canRetry: true } })
    expect(w.text()).toContain('Belum pernah dikirim.')
  })
})
