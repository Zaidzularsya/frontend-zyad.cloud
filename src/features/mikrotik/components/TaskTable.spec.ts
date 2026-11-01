import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TaskTable from '@/features/mikrotik/components/TaskTable.vue'
import { taskFixture } from '@/features/mikrotik/testing/fixtures'
import { taskErrorAction } from '@/features/mikrotik/utils/errors'

const TOOLTIP = 'Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.'

const failed = taskFixture({
  id: 't-failed',
  status: 'failed',
  action: 'restore',
  attempts: 5,
  last_error_code: 'auth_failed',
})
const pending = taskFixture({ id: 't-pending', status: 'pending' })

function retryButtons(w: ReturnType<typeof mount>) {
  return w.findAll('button').filter((b) => b.text() === 'Coba Lagi')
}

describe('TaskTable', () => {
  it('shows the message and action from taskErrorAction for a failed task', () => {
    const w = mount(TaskTable, { props: { rows: [failed], canRetry: true } })
    const e = taskErrorAction('auth_failed')
    expect(w.text()).toContain(e.message)
    expect(w.text()).toContain(e.action)
    expect(w.text()).toContain('Budi Santoso')
    expect(w.text()).toContain('Core-1')
    expect(w.text()).toContain('budi')
  })

  it('renders the retry button only for failed tasks and enables it with permission', async () => {
    const w = mount(TaskTable, { props: { rows: [failed, pending], canRetry: true } })
    const buttons = retryButtons(w)
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.attributes('disabled')).toBeUndefined()
    await buttons[0]?.trigger('click')
    expect(w.emitted('retry')?.[0]).toEqual([failed])
  })

  it('renders a disabled retry button with the owner-only tooltip without permission', async () => {
    const w = mount(TaskTable, { props: { rows: [failed, pending], canRetry: false } })
    const buttons = retryButtons(w)
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.attributes('disabled')).toBeDefined()
    expect(buttons[0]?.attributes('title')).toBe(TOOLTIP)
    await buttons[0]?.trigger('click')
    expect(w.emitted('retry')).toBeUndefined()
  })
})
