import { describe, expect, it } from 'vitest'

import type { LeadActivityItem } from '@/features/crm/leads/api/leads.api'
import { feedSegments } from '@/features/crm/leads/utils/lead-activity-feed'

const base: LeadActivityItem = {
  kind: 'created',
  occurred_at: '2026-09-28T03:00:00Z',
  lead_id: 'lead-1',
  lead_name: 'Maya Kusuma',
}

const sentence = (item: LeadActivityItem) =>
  feedSegments(item)
    .map((segment) => segment.text)
    .join('')

describe('feedSegments', () => {
  it('names the actor when known and falls back without one', () => {
    expect(sentence({ ...base, actor_name: 'Rizky' })).toBe('Rizky menambahkan lead Maya Kusuma')
    expect(sentence(base)).toBe('Lead baru Maya Kusuma')
  })

  it('uses the status label for status changes', () => {
    expect(
      sentence({
        ...base,
        kind: 'status_changed',
        actor_name: 'Dian',
        from_value: 'new',
        to_value: 'qualified',
      }),
    ).toBe('Dian memindahkan Maya Kusuma ke Qualified')
  })

  it('describes assignment and unassignment', () => {
    expect(
      sentence({
        ...base,
        kind: 'assigned',
        actor_name: 'Dian',
        to_value: 'u-2',
        to_name: 'Rizky',
      }),
    ).toBe('Dian meng-assign Maya Kusuma ke Rizky')
    expect(sentence({ ...base, kind: 'assigned', actor_name: 'Dian', from_value: 'u-2' })).toBe(
      'Dian melepas owner Maya Kusuma',
    )
  })

  it('describes activities with type and subject', () => {
    expect(
      sentence({
        ...base,
        kind: 'activity_completed',
        actor_name: 'Rizky',
        activity_type: 'call',
        subject: 'Demo',
      }),
    ).toBe('Rizky menyelesaikan telepon “Demo” dengan Maya Kusuma')
    expect(sentence({ ...base, kind: 'activity_created', activity_type: 'whatsapp' })).toBe(
      'Percakapan WhatsApp dengan Maya Kusuma',
    )
  })

  it('marks names as strong and never returns markup', () => {
    const segments = feedSegments({ ...base, lead_name: '<img src=x>', actor_name: 'Rizky' })
    expect(segments.filter((segment) => segment.strong).map((segment) => segment.text)).toEqual([
      'Rizky',
      '<img src=x>',
    ])
  })
})
