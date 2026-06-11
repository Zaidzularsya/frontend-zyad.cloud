export interface ApiEnvelope<T> {
  data: T
  meta?: Record<string, unknown>
}

export interface ApiErrorPayload {
  code: string
  message: string
  errors?: Record<string, string[]>
  requestId?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}
