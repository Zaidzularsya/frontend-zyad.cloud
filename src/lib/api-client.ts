import type { AxiosRequestConfig } from 'axios'

import { http } from '@/lib/http'
import type { ApiEnvelope } from '@/types/api'

export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await http.get<ApiEnvelope<T>>(url, config)
    return response.data.data
  },
  async post<T, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig) {
    const response = await http.post<ApiEnvelope<T>>(url, body, config)
    return response.data.data
  },
  async put<T, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig) {
    const response = await http.put<ApiEnvelope<T>>(url, body, config)
    return response.data.data
  },
  async patch<T, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig) {
    const response = await http.patch<ApiEnvelope<T>>(url, body, config)
    return response.data.data
  },
  async delete<T = void>(url: string, config?: AxiosRequestConfig) {
    const response = await http.delete<ApiEnvelope<T>>(url, config)
    return response.data.data
  },
}
