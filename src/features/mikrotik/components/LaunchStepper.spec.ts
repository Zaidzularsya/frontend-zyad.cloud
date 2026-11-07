import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LaunchStepper from '@/features/mikrotik/components/LaunchStepper.vue'
import type { IsolationMode } from '@/features/mikrotik/types'

describe('LaunchStepper', () => {
  it.each([
    ['simulation', 'Simulasi'],
    ['pilot', 'Pilot'],
    ['active', 'Aktif'],
    ['paused', 'Aktif'],
  ] as [IsolationMode, string][])('menandai langkah %s sebagai aktif', (mode, label) => {
    const w = mount(LaunchStepper, { props: { mode } })
    const current = w.findAll('[aria-current="step"]')
    expect(current).toHaveLength(1)
    expect(current[0]?.text()).toContain(label)
  })

  it('menandai langkah sebelumnya sebagai selesai', () => {
    const w = mount(LaunchStepper, { props: { mode: 'pilot' } })
    const states = w.findAll('li').map((li) => li.attributes('data-state'))
    expect(states).toEqual(['done', 'current', 'todo'])
  })
})
