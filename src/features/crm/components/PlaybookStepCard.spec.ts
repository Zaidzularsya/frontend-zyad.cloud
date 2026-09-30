import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/crm/settings/api/crm-settings.api', () => ({
  crmSettingsApi: { get: vi.fn().mockResolvedValue({ lead_playbook_enabled: true }) },
}))
vi.mock('@/features/crm/leads/api/leads.api', () => ({ leadsApi: { startPlaybook: vi.fn() } }))
vi.mock('@/features/crm/activities/api/activities.api', () => ({ activitiesApi: {} }))

import PlaybookStepCard from './PlaybookStepCard.vue'

const baseLead = {
  id: 'l1',
  contact_name: 'Andi',
  status: 'new',
  score: 0,
  address: {},
  created_at: '',
  updated_at: '',
  phone: '+62812',
  email: '',
}
const step = {
  id: 'a1',
  related_entity_type: 'lead',
  related_entity_id: 'l1',
  type: 'call',
  subject: 'Kontak pertama',
  status: 'pending',
  created_at: '',
  updated_at: '',
  due_at: new Date(Date.now() + 3600_000).toISOString(),
  playbook: {
    run_id: 'r1',
    step_key: 'first_contact',
    step_name: 'Kontak pertama',
    attempt_no: 2,
    final_review: false,
    channel_actions: ['whatsapp', 'email', 'call'],
    outcomes: [],
  },
}

function mountCard(props: Record<string, unknown>) {
  return mount(PlaybookStepCard, {
    props: { readonly: false, ...props } as never,
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { Teleport: true },
    },
  })
}

describe('PlaybookStepCard', () => {
  it('shows the step, attempt and channel actions; email disabled without address', () => {
    const wrapper = mountCard({
      lead: { ...baseLead, playbook_run: { run_id: 'r1', status: 'active', final_review: false } },
      step,
    })
    expect(wrapper.text()).toContain('Kontak pertama · percobaan 2')
    const email = wrapper.find('[data-test="channel-email"]')
    expect(email.attributes('disabled')).toBeDefined()
    wrapper.find('[data-test="channel-whatsapp"]').trigger('click')
    expect(wrapper.emitted('channel')?.[0]).toEqual(['whatsapp'])
  })

  it('offers Mulai SOP when there is no run', () => {
    const wrapper = mountCard({ lead: { ...baseLead, playbook_run: null }, step: null })
    expect(wrapper.find('[data-test="start-sop"]').exists()).toBe(true)
  })

  it('summarises a finished run', () => {
    const wrapper = mountCard({
      lead: {
        ...baseLead,
        status: 'unqualified',
        disqualify_reason: 'unresponsive',
        playbook_run: {
          run_id: 'r1',
          status: 'completed',
          result: 'disqualified',
          final_review: false,
        },
      },
      step: null,
    })
    expect(wrapper.text()).toContain('SOP selesai')
    expect(wrapper.text()).toContain('Tidak responsif')
  })
})
