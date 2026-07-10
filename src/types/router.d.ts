import 'vue-router'

import type { Permission } from '@/types/auth'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    guestOnly?: boolean
    requiresTenant?: boolean
    requiresPlatform?: boolean
    permissions?: Permission[]
  }
}
