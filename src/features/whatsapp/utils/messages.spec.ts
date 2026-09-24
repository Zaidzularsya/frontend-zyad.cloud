import { describe, expect, it } from 'vitest'

import type { WhatsAppMessage } from '@/features/whatsapp/types'
import { groupByDay } from '@/features/whatsapp/utils/messages'

const message = (id: string, sentAt: Date): WhatsAppMessage => ({
  id,
  conversation_id: 'c1',
  direction: 'in',
  body: id,
  has_media: false,
  status: 'delivered',
  sent_at: sentAt.toISOString(),
})

describe('groupByDay', () => {
  it('labels today, yesterday, and older days in order', () => {
    const now = new Date(2026, 8, 24, 15, 0)
    const groups = groupByDay(
      [
        message('a', new Date(2026, 8, 20, 9, 0)),
        message('b', new Date(2026, 8, 23, 9, 0)),
        message('c', new Date(2026, 8, 24, 8, 0)),
        message('d', new Date(2026, 8, 24, 9, 0)),
      ],
      now,
    )
    expect(groups.map((group) => group.label)).toEqual(['20 September 2026', 'Kemarin', 'Hari ini'])
    expect(groups[2]?.messages.map((m) => m.id)).toEqual(['c', 'd'])
  })

  it('returns no groups for no messages', () => {
    expect(groupByDay([])).toEqual([])
  })
})
