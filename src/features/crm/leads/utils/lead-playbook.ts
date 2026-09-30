import type {
  ChannelAction,
  CompleteActivityPayload,
  PlaybookOutcomeOption,
} from '@/features/crm/activities/api/activities.api'
import type { DisqualifyReason } from '@/features/crm/leads/api/leads.api'

export const disqualifyReasonLabels: Record<DisqualifyReason, string> = {
  unresponsive: 'Tidak responsif',
  not_interested: 'Tidak tertarik',
  not_fit: 'Tidak cocok kebutuhan',
  budget: 'Budget tidak masuk',
  competitor: 'Pilih kompetitor',
  bad_data: 'Data salah',
  duplicate: 'Duplikat',
  bad_timing: 'Belum waktunya',
}

export const channelActionLabels: Record<ChannelAction, string> = {
  whatsapp: 'Chat WhatsApp',
  email: 'Email',
  call: 'Telepon',
  schedule_meeting: 'Jadwalkan meeting',
  requirements_form: 'Isi form kebutuhan',
}

export interface OutcomeForm {
  rescheduleAt: string // datetime-local
  summary: string
  budget: string
  targetDate: string // YYYY-MM-DD
  decisionMaker: string
  reason: DisqualifyReason | ''
  note: string
}

export function emptyOutcomeForm(): OutcomeForm {
  return {
    rescheduleAt: '',
    summary: '',
    budget: '',
    targetDate: '',
    decisionMaker: '',
    reason: '',
    note: '',
  }
}

const moneyPattern = /^\d{1,16}(\.\d{1,2})?$/

export function validateOutcomeForm(
  option: PlaybookOutcomeOption | null,
  form: OutcomeForm,
  now = new Date(),
): string | null {
  if (!option) return 'Pilih hasil terlebih dahulu.'
  switch (option.required_input) {
    case 'reschedule':
      if (!form.rescheduleAt || new Date(form.rescheduleAt) <= now)
        return 'Pilih waktu yang akan datang.'
      return null
    case 'requirements':
      if (!form.summary.trim()) return 'Kebutuhan wajib diisi.'
      if (form.budget && !moneyPattern.test(form.budget.trim()))
        return 'Budget harus angka, maksimal 2 desimal.'
      return null
    case 'disqualify':
      return form.reason ? null : 'Pilih alasan.'
    default:
      return null
  }
}

export function buildCompletePayload(
  option: PlaybookOutcomeOption,
  form: OutcomeForm,
): CompleteActivityPayload {
  const payload: CompleteActivityPayload = { outcome_key: option.key }
  if (option.required_input === 'reschedule') {
    payload.reschedule_at = new Date(form.rescheduleAt).toISOString()
  }
  if (option.required_input === 'requirements') {
    const requirements: NonNullable<CompleteActivityPayload['requirements']> = {
      summary: form.summary.trim(),
    }
    if (form.budget.trim()) requirements.budget_estimate = form.budget.trim()
    if (form.targetDate) requirements.target_date = form.targetDate
    if (form.decisionMaker.trim()) requirements.decision_maker = form.decisionMaker.trim()
    payload.requirements = requirements
  }
  if (option.required_input === 'disqualify' && form.reason) {
    payload.disqualify = {
      reason: form.reason,
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    }
  }
  return payload
}

export function stepLabel(p: { step_name?: string; attempt_no?: number; final_review?: boolean }) {
  if (p.final_review) return 'Tinjau: lead tidak responsif'
  const name = p.step_name ?? ''
  return p.attempt_no && p.attempt_no > 1 ? `${name} · percobaan ${p.attempt_no}` : name
}

/** Label of a completed step's outcome (the activity no longer lists options). */
export const outcomeLabels: Record<string, string> = {
  connected: 'Terhubung',
  no_response: 'Tidak respon',
  call_back_later: 'Minta dihubungi nanti',
  bad_data: 'Data salah',
  give_up: 'Unqualify — tidak responsif',
  qualified: 'Qualified',
  bad_timing: 'Belum waktunya',
  not_fit: 'Tidak cocok / tidak tertarik',
}
