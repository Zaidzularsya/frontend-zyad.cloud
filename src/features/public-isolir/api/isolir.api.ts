import { http } from '@/lib/http'

import type { IsolirInfo, IsolirLookup } from '../types'

/**
 * Halaman isolir publik — tanpa login, tenant di-resolve backend dari Host.
 * Backend: GET /public/isolir/info, POST /public/isolir/lookup.
 */
interface Envelope<T> {
  success: boolean
  data: T
}

export const isolirApi = {
  info: async (): Promise<IsolirInfo> =>
    (await http.get<Envelope<IsolirInfo>>('/public/isolir/info')).data.data,

  lookup: async (query: string): Promise<IsolirLookup> =>
    (await http.post<Envelope<IsolirLookup>>('/public/isolir/lookup', { query })).data.data,
}
