import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGet = vi.fn()
const httpPut = vi.fn()
const httpPost = vi.fn()

vi.mock('@/lib/http', () => ({
  http: {
    get: (...a: unknown[]) => httpGet(...a),
    put: (...a: unknown[]) => httpPut(...a),
    post: (...a: unknown[]) => httpPost(...a),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { landingApi } from './landing.api'

describe('landingApi — GrapesJS document', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getDocument() calls the document endpoint and normalises the payload', async () => {
    httpGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          landing_page_id: 'p1',
          project: { pages: [{ name: 'Home' }] },
          html: '<body><h1>Hi</h1></body>',
          css: 'h1{color:red}',
          updated_at: '2026-09-10T08:00:00Z',
        },
      },
    })

    const res = await landingApi.getDocument('p1')

    expect(httpGet).toHaveBeenCalledWith('/admin/landing-pages/p1/document', { params: undefined })
    expect(res.data).toEqual({
      landing_page_id: 'p1',
      project: { pages: [{ name: 'Home' }] },
      html: '<body><h1>Hi</h1></body>',
      css: 'h1{color:red}',
      updated_at: '2026-09-10T08:00:00Z',
    })
  })

  it('getDocument() falls back to safe defaults for a blank document row', async () => {
    httpGet.mockResolvedValue({ data: { success: true, data: { landing_page_id: 'p1' } } })

    const res = await landingApi.getDocument('p1')

    expect(res.data.project).toEqual({})
    expect(res.data.html).toBe('')
    expect(res.data.css).toBe('')
  })

  it('saveDocument() PUTs the project/html/css body', async () => {
    httpPut.mockResolvedValue({
      data: { success: true, data: { landing_page_id: 'p1', updated_at: '2026-09-10T09:00:00Z' } },
    })
    const payload = { project: { pages: [] }, html: '<body>x</body>', css: 'x{}' }

    const res = await landingApi.saveDocument('p1', payload)

    expect(httpPut).toHaveBeenCalledWith('/admin/landing-pages/p1/document', payload)
    expect(res.data.updated_at).toBe('2026-09-10T09:00:00Z')
  })
})

import { normalizeForm, normalizeSubmission } from './landing.api'

describe('normalizeSubmission', () => {
  it('reads PascalCase domain structs (admin list / retry)', () => {
    const s = normalizeSubmission({
      ID: 's1',
      LandingPageID: 'p1',
      FormID: 'f1',
      Reference: 'SUB-1',
      Status: 'new',
      SubmittedData: { name: 'A' },
      SubmittedAt: '2026-10-07T01:00:00Z',
      CRMLeadID: '',
      CRMSyncStatus: 'failed',
      CRMSyncError: 'LANDING_FORM_OWNER_MISSING: x',
    })
    expect(s).toEqual({
      id: 's1',
      landing_page_id: 'p1',
      form_id: 'f1',
      reference: 'SUB-1',
      status: 'new',
      submitted_data: { name: 'A' },
      submitted_at: '2026-10-07T01:00:00Z',
      crm_lead_id: null,
      crm_sync_status: 'failed',
      crm_sync_error: 'LANDING_FORM_OWNER_MISSING: x',
    })
  })

  it('reads snake_case DTOs and defaults unknown sync status to skipped', () => {
    const s = normalizeSubmission({
      id: 's2',
      crm_lead_id: 'l1',
      crm_sync_status: 'weird',
      crm_sync_error: null,
    })
    expect(s.crm_lead_id).toBe('l1')
    expect(s.crm_sync_status).toBe('skipped')
    expect(s.crm_sync_error).toBeNull()
    expect(s.submitted_data).toEqual({})
  })
})

describe('normalizeForm — CRM fields', () => {
  it('maps create_crm_lead and lead_owner_user_id from both shapes', () => {
    expect(normalizeForm({ ID: 'f', CreateCRMLead: true, LeadOwnerUserID: '' })).toMatchObject({
      create_crm_lead: true,
      lead_owner_user_id: null,
    })
    expect(
      normalizeForm({ id: 'f', create_crm_lead: false, lead_owner_user_id: 'u1' }),
    ).toMatchObject({
      create_crm_lead: false,
      lead_owner_user_id: 'u1',
    })
  })
})

describe('landingApi — submissions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listSubmissions normalises a bare array and sends params', async () => {
    httpGet.mockResolvedValue({
      data: { success: true, data: [{ ID: 's1', CRMSyncStatus: 'created' }] },
    })
    const res = await landingApi.listSubmissions({ page: 2, per_page: 20, landing_page_id: 'p1' })
    expect(httpGet).toHaveBeenCalledWith('/admin/landing-submissions', {
      params: { page: 2, per_page: 20, landing_page_id: 'p1' },
    })
    expect(res.data[0]!.id).toBe('s1')
    expect(res.meta.total).toBe(1)
  })

  it('retrySubmissionCrmSync posts and normalises', async () => {
    httpPost.mockResolvedValue({
      data: { success: true, data: { ID: 's1', CRMSyncStatus: 'merged' } },
    })
    const res = await landingApi.retrySubmissionCrmSync('s1')
    expect(httpPost).toHaveBeenCalledWith('/admin/landing-submissions/s1/crm-sync', undefined)
    expect(res.crm_sync_status).toBe('merged')
  })

  it('submitPublicForm sends Idempotency-Key and throws SubmitFormError with status', async () => {
    httpPost.mockResolvedValueOnce({ data: { success: true } })
    await landingApi.submitPublicForm(
      'f1',
      { fields: { name: 'A' }, consent: true, website: '', context: {} },
      'key-1',
    )
    expect(httpPost).toHaveBeenCalledWith(
      '/public/landing/forms/f1/submissions',
      { fields: { name: 'A' }, consent: true, website: '', context: {} },
      { headers: { 'Idempotency-Key': 'key-1' } },
    )

    httpPost.mockRejectedValueOnce({ response: { status: 429, data: { code: 'RATE_LIMITED' } } })
    await expect(
      landingApi.submitPublicForm(
        'f1',
        { fields: {}, consent: true, website: '', context: {} },
        'k',
      ),
    ).rejects.toMatchObject({ name: 'SubmitFormError', status: 429, code: 'RATE_LIMITED' })
  })
})
