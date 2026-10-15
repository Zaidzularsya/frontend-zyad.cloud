import { http } from '@/lib/http'
import type {
  PageTemplateDetail,
  PageTemplateSummary,
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
}
