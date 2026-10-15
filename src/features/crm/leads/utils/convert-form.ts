import type { ConvertDealInput, ConvertLeadPayload, Lead } from '@/features/crm/leads/api/leads.api'
import { defaultStartStageId } from '@/features/crm/deals/utils/deal-stage-track'
import type { Pipeline } from '@/features/crm/pipelines/api/pipelines.api'

export interface DealForm {
  pipelineId: string
  stageId: string
  title: string
  value: string
  expectedCloseDate: string
  description: string
  decisionMaker: string
  ownerUserId: string
}

export interface ConvertForm {
  companyMode: 'none' | 'existing' | 'new'
  companyId: string
  companyName: string
  industry: string
  website: string
  phone: string
  createDeal: boolean
  deal: DealForm
}

const AMOUNT = /^\d{1,16}(\.\d{1,2})?$/

export function defaultDealTitle(lead: Pick<Lead, 'contact_name' | 'requirement_summary'>): string {
  const summary = (lead.requirement_summary ?? '').split(/\s+/).filter(Boolean).join(' ')
  if (!summary) return `Deal ${lead.contact_name}`
  return summary.length > 120 ? `${summary.slice(0, 119)}…` : summary
}

/** Terima "15000000", "15.000.000", "Rp 15.000.000", "15.000.000,50", "15000000.00". */
export function normalizeAmount(input: string): string | null {
  let s = input.replace(/rp/gi, '').replace(/\s/g, '')
  if (!s) return ''
  if (s.includes(',')) {
    // Format Indonesia: titik ribuan, koma desimal.
    if ((s.match(/,/g) ?? []).length > 1) return null
    s = s.replace(/\./g, '').replace(',', '.')
  } else if ((s.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  return AMOUNT.test(s) ? s : null
}

export function activePipelines(pipelines: Pipeline[]): Pipeline[] {
  return pipelines
    .filter((p) => !p.archived_at && !p.deleted_at)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
}

export function prefillDealForm(lead: Lead, pipelines: Pipeline[]): DealForm {
  const pipeline = activePipelines(pipelines)[0]
  return {
    pipelineId: pipeline?.id ?? '',
    stageId: pipeline ? (defaultStartStageId(pipeline.stages) ?? '') : '',
    title: defaultDealTitle(lead),
    value: lead.budget_estimate ?? '',
    expectedCloseDate: lead.target_date ?? '',
    description: lead.requirement_summary ?? '',
    decisionMaker: lead.decision_maker ?? '',
    ownerUserId: lead.owner_user_id ?? '',
  }
}

export function prefillConvertForm(lead: Lead, pipelines: Pipeline[]): ConvertForm {
  const deal = prefillDealForm(lead, pipelines)
  const companyName = (lead.company_name ?? '').trim()
  return {
    companyMode: companyName ? 'new' : 'none',
    companyId: '',
    companyName,
    industry: '',
    website: '',
    phone: '',
    createDeal: Boolean(deal.pipelineId && deal.stageId),
    deal,
  }
}

export function validateDealForm(form: DealForm): string | null {
  if (!form.pipelineId || !form.stageId) return 'Pilih pipeline dan stage.'
  if (!form.title.trim()) return 'Judul deal wajib diisi.'
  if (form.title.trim().length > 200) return 'Judul deal maksimal 200 karakter.'
  if (normalizeAmount(form.value) === null) return 'Nilai deal harus berupa angka.'
  return null
}

export function validateConvertForm(form: ConvertForm): string | null {
  if (form.companyMode === 'existing' && !form.companyId) return 'Pilih company yang sudah ada.'
  if (form.companyMode === 'new' && !form.companyName.trim()) return 'Nama company wajib diisi.'
  return form.createDeal ? validateDealForm(form.deal) : null
}

const opt = (value: string) => value.trim() || undefined

export function buildDealInput(form: DealForm): ConvertDealInput {
  return {
    pipeline_id: form.pipelineId,
    stage_id: form.stageId,
    title: form.title.trim(),
    value: normalizeAmount(form.value) || undefined,
    expected_close_date: opt(form.expectedCloseDate),
    description: opt(form.description),
    decision_maker: opt(form.decisionMaker),
    owner_user_id: opt(form.ownerUserId),
  }
}

export function buildConvertPayload(form: ConvertForm): ConvertLeadPayload {
  const payload: ConvertLeadPayload = {}
  if (form.companyMode === 'existing')
    payload.company = { mode: 'existing', company_id: form.companyId }
  else if (form.companyMode === 'new')
    payload.company = {
      mode: 'new',
      name: form.companyName.trim(),
      industry: opt(form.industry),
      website: opt(form.website),
      phone: opt(form.phone),
    }
  else payload.company = { mode: 'none' }
  if (form.createDeal) payload.deal = buildDealInput(form.deal)
  return payload
}
