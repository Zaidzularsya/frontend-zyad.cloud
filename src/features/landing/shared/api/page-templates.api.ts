import { http } from '@/lib/http'
import type {
  CreatePageTemplatePayload,
  PageTemplateAdminSummary,
  PageTemplateDetail,
  PageTemplateSummary,
  UpdatePageTemplatePayload,
} from '@/features/landing/shared/types/page-template.types'

interface Envelope<T> {
  success: boolean
  data: T
}

export const pageTemplatesApi = {
  async list(): Promise<PageTemplateSummary[]> {
    const res = await http.get<Envelope<PageTemplateSummary[] | null>>('/admin/landing-templates')
    return res.data.data ?? []
  },

  async get(id: string): Promise<PageTemplateDetail> {
    const res = await http.get<Envelope<PageTemplateDetail>>(`/admin/landing-templates/${id}`)
    return res.data.data
  },

  async listAll(): Promise<PageTemplateAdminSummary[]> {
    const res = await http.get<Envelope<PageTemplateAdminSummary[] | null>>(
      '/admin/landing-templates/all',
    )
    return res.data.data ?? []
  },

  async create(payload: CreatePageTemplatePayload): Promise<PageTemplateDetail> {
    const res = await http.post<Envelope<PageTemplateDetail>>('/admin/landing-templates', payload)
    return res.data.data
  },

  async refreshFromPage(id: string): Promise<PageTemplateDetail> {
    const res = await http.post<Envelope<PageTemplateDetail>>(
      `/admin/landing-templates/${id}/refresh-from-page`,
    )
    return res.data.data
  },

  async copyToPage(id: string): Promise<{ page_id: string; slug: string }> {
    const res = await http.post<Envelope<{ page_id: string; slug: string }>>(
      `/admin/landing-templates/${id}/copy-to-page`,
    )
    return res.data.data
  },

  async update(id: string, payload: UpdatePageTemplatePayload): Promise<PageTemplateDetail> {
    const res = await http.patch<Envelope<PageTemplateDetail>>(
      `/admin/landing-templates/${id}`,
      payload,
    )
    return res.data.data
  },
}
