import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DealStageTrack from './DealStageTrack.vue'

const stages = [
  { id: 'a', name: 'Baru', position: 0, probability: '0', is_won: false, is_lost: false },
  { id: 'b', name: 'Survei', position: 1, probability: '0', is_won: false, is_lost: false },
  { id: 'w', name: 'Won', position: 2, probability: '100', is_won: true, is_lost: false },
]

describe('DealStageTrack', () => {
  it('renders nodes in order and marks the current one', () => {
    const w = mount(DealStageTrack, { props: { stages, currentStageId: 'b' } })
    const items = w.findAll('li')
    expect(items.map((i) => i.text())).toEqual(['Baru', 'Survei', 'Won'])
    expect(items[1]?.attributes('aria-current')).toBe('step')
  })

  it('emits select only for open stages when clickable', async () => {
    const w = mount(DealStageTrack, { props: { stages, currentStageId: 'a', clickable: true } })
    await w.findAll('button')[1]?.trigger('click')
    expect(w.emitted('select')).toEqual([['b']])
    expect(w.findAll('button')).toHaveLength(2)
  })
})
