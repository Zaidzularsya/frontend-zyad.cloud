import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const convert = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ lead: { id: 'l1' }, contact: { id: 'c1' }, deal: { id: 'd1' } }),
)
const stage = (id: string, position: number) => ({
  id,
  name: id,
  position,
  probability: '0',
  is_won: false,
  is_lost: false,
})
let pipelineData = [
  {
    id: 'p1',
    name: 'Rumah',
    is_default: true,
    stages: [stage('s1', 0), stage('s2', 1)],
    created_at: '',
    updated_at: '',
  },
]

vi.mock('@/features/crm/pipelines/api/pipelines.api', () => ({
  pipelinesApi: { list: vi.fn(() => Promise.resolve({ data: pipelineData, meta: {} })) },
}))
vi.mock('@/features/crm/leads/api/leads.api', () => ({
  leadsApi: { convert, members: vi.fn().mockResolvedValue([{ user_id: 'u1', name: 'Andi' }]) },
}))
vi.mock('@/features/crm/companies/api/companies.api', () => ({
  companiesApi: { lookup: vi.fn().mockResolvedValue([{ id: 'co1', name: 'PT Maju Jaya Abadi' }]) },
}))

import LeadConvertDialog from './LeadConvertDialog.vue'

const lead = {
  id: 'l1',
  contact_name: 'Budi',
  status: 'qualified',
  score: 0,
  address: {},
  created_at: '',
  updated_at: '',
  company_name: 'PT Maju Jaya',
  requirement_summary: 'Internet 50 Mbps',
  budget_estimate: '15000000.00',
  owner_user_id: 'u1',
}

function mountDialog() {
  return mount(LeadConvertDialog, {
    props: { lead: lead as never },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      // BaseModal memakai Teleport; render inline agar bisa di-query dari wrapper.
      stubs: { teleport: true },
    },
  })
}

describe('LeadConvertDialog', () => {
  it('prefills deal fields and shows the stage track', async () => {
    const w = mountDialog()
    await flushPromises()
    expect((w.get('input[name="deal-title"]').element as HTMLInputElement).value).toBe(
      'Internet 50 Mbps',
    )
    expect(w.text()).toContain('s1')
    expect(w.find('[aria-current="step"]').text()).toContain('s1')
  })

  it('warns about similar companies', async () => {
    const w = mountDialog()
    await flushPromises()
    expect(w.text()).toContain('PT Maju Jaya Abadi')
  })

  it('submits the built payload and emits converted', async () => {
    const w = mountDialog()
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(convert).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({
        deal: expect.objectContaining({ pipeline_id: 'p1', stage_id: 's1', value: '15000000.00' }),
        company: expect.objectContaining({ mode: 'new', name: 'PT Maju Jaya' }),
      }),
    )
    expect(w.emitted('converted')).toHaveLength(1)
  })

  it('disables the deal checkbox when there is no active pipeline', async () => {
    pipelineData = []
    const w = mountDialog()
    await flushPromises()
    const box = w.get('input[name="create-deal"]').element as HTMLInputElement
    expect(box.disabled).toBe(true)
    expect(w.text()).toContain('Belum ada pipeline aktif')
    pipelineData = [
      {
        id: 'p1',
        name: 'Rumah',
        is_default: true,
        stages: [stage('s1', 0), stage('s2', 1)],
        created_at: '',
        updated_at: '',
      },
    ]
  })
})
