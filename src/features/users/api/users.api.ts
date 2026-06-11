import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse } from '@/types/api'
import type { User } from '@/types/user'

export interface UserListParams {
  page: number
  perPage: number
  search?: string
}

export const usersApi = {
  list: (params: UserListParams) => apiClient.get<PaginatedResponse<User>>('/users', { params }),
}
