import { describe, expect, it } from 'vitest'

import {
  activePipelines,
  buildConvertPayload,
  defaultDealTitle,
  normalizeAmount,
  prefillConvertForm,
  validateConvertForm,
} from './convert-form'

const stage = (id: string, position: number, extra = {}) => ({
  id,
  name: id,
  position,
  probability: '0',
  is_won: false,
  is_lost: false,
  ...extra,
})
const pipelines = [
  {
    id: 'arch',
    name: 'Lama',
    is_default: false,
    archived_at: '2026-01-01',
    stages: [stage('x', 0)],
    created_at: '',
    updated_at: '',
  },
  {
    id: 'korp',
    name: 'Korporat',
    is_default: false,
    stages: [stage('k1', 0)],
    created_at: '',
    updated_at: '',
  },
  {
    id: 'rumah',
    name: 'Rumah',
    is_default: true,
    stages: [stage('won', 0, { is_won: true }), stage('r1', 1)],
    created_at: '',
    updated_at: '',
  },
]
const lead = {
  id: 'l1',
  contact_name: 'Budi',
  status: 'qualified',
  score: 0,
  address: {},
  created_at: '',
  updated_at: '',
  company_name: 'PT Maju',
  requirement_summary: 'Internet 50 Mbps',
  budget_estimate: '15000000.00',
  target_date: '2026-11-30',
  decision_maker: 'Bu Rina',
  owner_user_id: 'u1',
} as never

describe('normalizeAmount', () => {
  it.each([
    ['', ''],
    ['15000000', '15000000'],
    ['15.000.000', '15000000'],
    ['Rp 15.000.000', '15000000'],
    ['15.000.000,50', '15000000.50'],
    ['15000000.00', '15000000.00'],
    ['1.5', '1.5'],
  ])('%s → %s', (input, want) => expect(normalizeAmount(input)).toBe(want))

  it.each(['abc', '-5', '1,234,5', '12.34.5,6,7'])('rejects %s', (input) =>
    expect(normalizeAmount(input)).toBeNull(),
  )
})

describe('prefillConvertForm', () => {
  it('uses the default active pipeline and its first startable stage', () => {
    const f = prefillConvertForm(lead, pipelines)
    expect(f.deal.pipelineId).toBe('rumah')
    expect(f.deal.stageId).toBe('r1')
    expect(f.deal.title).toBe('Internet 50 Mbps')
    expect(f.deal.value).toBe('15000000.00')
    expect(f.deal.expectedCloseDate).toBe('2026-11-30')
    expect(f.companyMode).toBe('new')
    expect(f.companyName).toBe('PT Maju')
    expect(f.createDeal).toBe(true)
  })

  it('falls back when the lead has no requirements and no company', () => {
    const bare = {
      ...(lead as object),
      company_name: '',
      requirement_summary: '',
      budget_estimate: null,
      target_date: null,
    } as never
    const f = prefillConvertForm(bare, pipelines)
    expect(f.deal.title).toBe('Deal Budi')
    expect(f.deal.value).toBe('')
    expect(f.companyMode).toBe('none')
  })

  it('disables deal creation when there is no active pipeline', () => {
    const f = prefillConvertForm(lead, pipelines.slice(0, 1))
    expect(f.createDeal).toBe(false)
    expect(f.deal.pipelineId).toBe('')
  })
})

describe('activePipelines', () => {
  it('drops archived and puts the default first', () => {
    expect(activePipelines(pipelines as never).map((p) => p.id)).toEqual(['rumah', 'korp'])
  })
})

describe('validate & build', () => {
  it('requires a title and a valid amount', () => {
    const f = prefillConvertForm(lead, pipelines)
    expect(validateConvertForm({ ...f, deal: { ...f.deal, title: ' ' } })).toBe(
      'Judul deal wajib diisi.',
    )
    expect(validateConvertForm({ ...f, deal: { ...f.deal, value: 'abc' } })).toBe(
      'Nilai deal harus berupa angka.',
    )
    expect(validateConvertForm({ ...f, companyMode: 'existing', companyId: '' })).toBe(
      'Pilih company yang sudah ada.',
    )
    expect(validateConvertForm(f)).toBeNull()
  })

  it('builds the payload with normalized amount and no deal when unchecked', () => {
    const f = prefillConvertForm(lead, pipelines)
    const payload = buildConvertPayload({ ...f, deal: { ...f.deal, value: 'Rp 20.000.000' } })
    expect(payload.deal).toMatchObject({
      pipeline_id: 'rumah',
      stage_id: 'r1',
      value: '20000000',
      title: 'Internet 50 Mbps',
    })
    expect(payload.company).toEqual({
      mode: 'new',
      name: 'PT Maju',
      industry: undefined,
      website: undefined,
      phone: undefined,
    })
    expect(buildConvertPayload({ ...f, createDeal: false }).deal).toBeUndefined()
    expect(buildConvertPayload({ ...f, companyMode: 'none' }).company).toEqual({ mode: 'none' })
  })

  it('caps the default title at 120 characters', () => {
    expect(
      defaultDealTitle({ contact_name: 'A', requirement_summary: 'x'.repeat(300) }).length,
    ).toBe(120)
  })
})
