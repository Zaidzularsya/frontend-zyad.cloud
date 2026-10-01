import { describe, expect, it } from 'vitest'

import { buildStageTrack, defaultStartStageId, startableStages } from './deal-stage-track'

const s = (
  id: string,
  position: number,
  extra: Partial<{ is_won: boolean; is_lost: boolean }> = {},
) => ({
  id,
  name: id,
  position,
  probability: '0',
  is_won: false,
  is_lost: false,
  ...extra,
})

const unordered = [
  s('lost', 9, { is_lost: true }),
  s('survei', 1),
  s('won', 8, { is_won: true }),
  s('baru', 0),
  s('penawaran', 2),
]

describe('deal-stage-track', () => {
  it('sorts by position with won/lost last', () => {
    expect(buildStageTrack(unordered, 'survei').map((n) => n.id)).toEqual([
      'baru',
      'survei',
      'penawaran',
      'won',
      'lost',
    ])
  })

  it('marks done/current/upcoming relative to the current stage', () => {
    const states = buildStageTrack(unordered, 'survei').map((n) => n.state)
    expect(states).toEqual(['done', 'current', 'upcoming', 'won', 'lost'])
  })

  it('marks every open stage done when the deal is won', () => {
    const states = buildStageTrack(unordered, 'won', 'won').map((n) => n.state)
    expect(states).toEqual(['done', 'done', 'done', 'current', 'lost'])
  })

  it('treats unknown current stage as nothing reached', () => {
    expect(
      buildStageTrack(unordered, null)
        .slice(0, 3)
        .every((n) => n.state === 'upcoming'),
    ).toBe(true)
  })

  it('defaults the start stage to the first non won/lost by position', () => {
    const wonFirst = [s('won', 0, { is_won: true }), s('b', 2), s('a', 1)]
    expect(defaultStartStageId(wonFirst)).toBe('a')
    expect(defaultStartStageId([s('won', 0, { is_won: true })])).toBeNull()
    expect(startableStages(unordered).map((x) => x.id)).toEqual(['baru', 'survei', 'penawaran'])
  })
})
