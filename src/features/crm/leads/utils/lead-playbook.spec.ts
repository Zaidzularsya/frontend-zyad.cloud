import { describe, expect, it } from 'vitest'

import {
  buildCompletePayload,
  emptyOutcomeForm,
  stepLabel,
  validateOutcomeForm,
} from '@/features/crm/leads/utils/lead-playbook'

const opt = (required_input: 'none' | 'requirements' | 'disqualify' | 'reschedule') => ({
  key: 'k',
  label: 'L',
  required_input,
})

describe('validateOutcomeForm', () => {
  it('requires an outcome', () => {
    expect(validateOutcomeForm(null, emptyOutcomeForm())).toBe('Pilih hasil terlebih dahulu.')
  })
  it('requires a future reschedule time', () => {
    const form = { ...emptyOutcomeForm(), rescheduleAt: '2000-01-01T09:00' }
    expect(validateOutcomeForm(opt('reschedule'), form)).toBe('Pilih waktu yang akan datang.')
  })
  it('requires requirement summary', () => {
    expect(validateOutcomeForm(opt('requirements'), emptyOutcomeForm())).toBe(
      'Kebutuhan wajib diisi.',
    )
  })
  it('rejects a malformed budget', () => {
    const form = { ...emptyOutcomeForm(), summary: 'CRM', budget: '12,5' }
    expect(validateOutcomeForm(opt('requirements'), form)).toBe(
      'Budget harus angka, maksimal 2 desimal.',
    )
  })
  it('requires a disqualify reason', () => {
    expect(validateOutcomeForm(opt('disqualify'), emptyOutcomeForm())).toBe('Pilih alasan.')
  })
  it('accepts none', () => {
    expect(validateOutcomeForm(opt('none'), emptyOutcomeForm())).toBeNull()
  })
})

describe('buildCompletePayload', () => {
  it('sends only what the outcome needs', () => {
    const form = {
      ...emptyOutcomeForm(),
      summary: ' CRM 10 user ',
      budget: '1000.5',
      targetDate: '2026-12-01',
      decisionMaker: '',
      reason: 'budget' as const,
    }
    expect(buildCompletePayload({ ...opt('requirements'), key: 'qualified' }, form)).toEqual({
      outcome_key: 'qualified',
      requirements: {
        summary: 'CRM 10 user',
        budget_estimate: '1000.5',
        target_date: '2026-12-01',
      },
    })
    expect(buildCompletePayload({ ...opt('none'), key: 'connected' }, form)).toEqual({
      outcome_key: 'connected',
    })
  })
  it('converts reschedule to ISO', () => {
    const form = { ...emptyOutcomeForm(), rescheduleAt: '2030-01-02T09:30' }
    const payload = buildCompletePayload({ ...opt('reschedule'), key: 'bad_timing' }, form)
    expect(payload.reschedule_at).toBe(new Date('2030-01-02T09:30').toISOString())
  })
})

describe('stepLabel', () => {
  it('names attempts and review', () => {
    expect(stepLabel({ step_name: 'Kontak pertama', attempt_no: 1 })).toBe('Kontak pertama')
    expect(stepLabel({ step_name: 'Kontak pertama', attempt_no: 2 })).toBe(
      'Kontak pertama · percobaan 2',
    )
    expect(stepLabel({ step_name: 'Kontak pertama', attempt_no: 3, final_review: true })).toBe(
      'Tinjau: lead tidak responsif',
    )
  })
})
