export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface ApiErrorPayload {
  success: false
  message: string
  error?: {
    code: string
    details?: Record<string, string[]>
  }
  requestId?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}
