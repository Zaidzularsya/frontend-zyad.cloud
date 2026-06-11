import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { usersApi, type UserListParams } from '@/features/users/api/users.api'

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => [...userKeys.all, 'list', params] as const,
}

export function useUsersQuery(params: Ref<UserListParams>) {
  return useQuery({
    queryKey: computed(() => userKeys.list(params.value)),
    queryFn: () => usersApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}
