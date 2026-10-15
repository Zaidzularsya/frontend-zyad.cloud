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
    // Halaman publik berbasis token (mis. link penawaran): tanpa login/tenant.
    public?: boolean
    permissions?: Permission[]
  }
}
