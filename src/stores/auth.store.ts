import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { authApi } from '@/features/auth/api/auth.api'
import type { GoogleLoginPayload, LoginPayload } from '@/features/auth/types'
import { tokenStorage } from '@/lib/auth'
import { queryClient } from '@/lib/query-client'
import type { AuthUser, Permission } from '@/types/auth'
import { useTenantStore } from '@/stores/tenant.store'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => Boolean(user.value))

  function can(permission: Permission) {
    return user.value?.permissions.includes(permission) ?? false
  }

  async function applySession(session: Awaited<ReturnType<typeof authApi.session>>) {
    user.value = session.user
    if (session.accessToken !== undefined) {
      tokenStorage.set(session.accessToken)
    }
    if (session.refreshToken !== undefined) {
      tokenStorage.setRefreshToken(session.refreshToken)
    }
    useTenantStore().hydrate(session.tenants, session.activeTenantId)
  }

  async function bootstrap() {
    if (initialized.value) return
    try {
      await applySession(await authApi.session())
    } catch {
      clearSession()
    } finally {
      initialized.value = true
    }
  }

  async function login(payload: LoginPayload) {
    await applySession(await authApi.login(payload))
    initialized.value = true
  }

  async function loginWithGoogle(payload: GoogleLoginPayload) {
    await applySession(await authApi.googleLogin(payload))
    initialized.value = true
  }

  async function completeGoogleRedirect(code: string) {
    await applySession(await authApi.googleExchange(code))
    initialized.value = true
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }

  function clearSession() {
    user.value = null
    tokenStorage.set()
    tokenStorage.setRefreshToken()
    useTenantStore().clear()
    queryClient.clear()
  }

  return {
    user,
    initialized,
    isAuthenticated,
    can,
    bootstrap,
    login,
    loginWithGoogle,
    completeGoogleRedirect,
    logout,
    clearSession,
  }
})
