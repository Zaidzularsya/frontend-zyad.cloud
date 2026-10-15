import { describe, expect, it } from 'vitest'

import {
  filterHistory,
  mergeHistory,
  splitActivities,
} from '@/features/crm/components/entity-history'

const act = (over: Record<string, unknown>) =>
  ({
    id: String(over.id),
    related_entity_type: 'lead',
    related_entity_id: 'l1',
    type: 'call',
    subject: 's',
    status: 'completed',
    created_at: '2026-09-30T01:00:00Z',
    updated_at: '2026-09-30T01:00:00Z',
    ...over,
  }) as never

describe('splitActivities', () => {
  it('separates the playbook step, other pending and done', () => {
    const r = splitActivities([
      act({ id: 'p', status: 'pending', playbook: { step_key: 'first_contact' } }),
      act({ id: 'o', status: 'pending', due_at: '2026-10-01T02:00:00Z' }),
      act({ id: 'd', status: 'completed' }),
      act({ id: 'c', status: 'cancelled' }),
    ])
    expect(r.playbookStep?.id).toBe('p')
    expect(r.otherPending.map((a) => a.id)).toEqual(['o'])
    expect(r.done.map((a) => a.id)).toEqual(['d', 'c'])
  })
})

describe('mergeHistory & filterHistory', () => {
  const items = mergeHistory(
    [
      act({ id: 'n', type: 'note', completed_at: '2026-09-30T03:00:00Z' }),
      act({ id: 'w', type: 'whatsapp', completed_at: '2026-09-30T02:00:00Z' }),
      act({ id: 'pending', status: 'pending' }),
    ],
    [
      {
        id: 'e',
        lead_id: 'l1',
        event_type: 'status_changed',
        created_at: '2026-09-30T04:00:00Z',
      } as never,
    ],
  )
  it('merges newest first and skips pending', () => {
    expect(items.map((i) => i.key)).toEqual(['event-e', 'activity-n', 'activity-w'])
  })
  it('filters by group and keyword', () => {
    expect(filterHistory(items, 'interaction', '').map((i) => i.key)).toEqual(['activity-w'])
    expect(filterHistory(items, 'note', '').map((i) => i.key)).toEqual(['activity-n'])
    expect(filterHistory(items, 'change', '').map((i) => i.key)).toEqual(['event-e'])
    expect(filterHistory(items, 'all', 'tidak ada')).toEqual([])
  })
})

describe('quotation response highlight', () => {
  it('marks quotation responses as highlighted interactions', () => {
    const items = mergeHistory(
      [
        act({
          id: 'a1',
          type: 'quotation_response',
          status: 'completed',
          metadata: { action: 'revision_requested', categories: ['price'], note: 'mahal' },
        }),
        act({
          id: 'a2',
          type: 'quotation_response',
          status: 'completed',
          metadata: { action: 'approved' },
        }),
        act({ id: 'a3', type: 'call', status: 'completed' }),
      ],
      [],
    )
    expect(items.find((i) => i.key === 'activity-a1')?.highlight).toBe('revision')
    expect(items.find((i) => i.key === 'activity-a2')?.highlight).toBe('approved')
    expect(items.find((i) => i.key === 'activity-a3')?.highlight).toBeUndefined()
    expect(items.find((i) => i.key === 'activity-a1')?.group).toBe('interaction')
  })
})
