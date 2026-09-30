import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const completeWithOutcome = vi.fn()
vi.mock('@/features/crm/activities/api/activities.api', () => ({
  activitiesApi: { completeWithOutcome: (...args: unknown[]) => completeWithOutcome(...args) },
}))

import PlaybookOutcomeDialog from './PlaybookOutcomeDialog.vue'

const activity = {
  id: 'a1',
  related_entity_type: 'lead',
  related_entity_id: 'l1',
  type: 'meeting',
  subject: 'Gali kebutuhan',
  status: 'pending',
  created_at: '',
  updated_at: '',
  playbook: {
    run_id: 'r1',
    step_key: 'discovery',
    step_name: 'Gali kebutuhan',
    attempt_no: 1,
    final_review: false,
    channel_actions: [],
    outcomes: [
      { key: 'qualified', label: 'Qualified', required_input: 'requirements' },
      { key: 'not_fit', label: 'Tidak cocok / tidak tertarik', required_input: 'disqualify' },
    ],
  },
}

function mountDialog() {
  return mount(PlaybookOutcomeDialog, {
    props: { activity },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { Teleport: true },
    },
  })
}

describe('PlaybookOutcomeDialog', () => {
  it('shows only the fields the chosen outcome needs and blocks invalid submit', async () => {
    const wrapper = mountDialog()
    expect(wrapper.find('[data-test="requirements-fields"]').exists()).toBe(false)

    await wrapper.find('input[value="qualified"]').setValue(true)
    expect(wrapper.find('[data-test="requirements-fields"]').exists()).toBe(true)

    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Kebutuhan wajib diisi.')
    expect(completeWithOutcome).not.toHaveBeenCalled()

    await wrapper.find('input[value="not_fit"]').setValue(true)
    expect(wrapper.find('[data-test="requirements-fields"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="disqualify-fields"]').exists()).toBe(true)
  })

  it('submits the built payload and emits completed', async () => {
    completeWithOutcome.mockResolvedValueOnce({
      activity: { id: 'a1' },
      lead: { status: 'qualified' },
    })
    const wrapper = mountDialog()
    await wrapper.find('input[value="qualified"]').setValue(true)
    await wrapper.find('[data-test="summary"]').setValue('CRM 10 user')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(completeWithOutcome).toHaveBeenCalledWith('a1', {
      outcome_key: 'qualified',
      requirements: { summary: 'CRM 10 user' },
    })
    expect(wrapper.emitted('completed')?.[0]?.[0]).toMatchObject({ lead: { status: 'qualified' } })
  })
})
