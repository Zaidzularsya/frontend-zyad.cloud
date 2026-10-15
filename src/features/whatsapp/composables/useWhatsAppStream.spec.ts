import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'

import { whatsappKeys } from '@/features/whatsapp/api/whatsapp.queries'
import { applyStreamEvent } from '@/features/whatsapp/composables/useWhatsAppStream'

function spyClient() {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
  const keys = () =>
    invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey)
  return { client, keys }
}

describe('applyStreamEvent', () => {
  it('refetches the conversation messages and its entity conversation on a new message', () => {
    const { client, keys } = spyClient()
    applyStreamEvent(client, {
      type: 'message',
      conversation_id: 'c1',
      related_entity_type: 'lead',
      related_entity_id: 'l1',
    })
    expect(keys()).toEqual([
      whatsappKeys.messages('c1'),
      whatsappKeys.entityConversation('lead', 'l1'),
    ])
  })

  it('only refreshes the unread badge on read events', () => {
    const { client, keys } = spyClient()
    applyStreamEvent(client, {
      type: 'read',
      conversation_id: 'c1',
      related_entity_type: 'lead',
      related_entity_id: 'l1',
    })
    expect(keys()).toEqual([whatsappKeys.entityConversation('lead', 'l1')])
  })

  it('refreshes every entity conversation when the conversation is not linked', () => {
    const { client, keys } = spyClient()
    applyStreamEvent(client, { type: 'ack', conversation_id: 'c2' })
    expect(keys()).toEqual([whatsappKeys.messages('c2'), whatsappKeys.entityConversations()])
  })
})
