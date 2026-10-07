import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { http } from '@/lib/http'
import {
  redirectToSuspended,
  WORKSPACE_SUSPENDED_EVENT,
  WORKSPACE_SUSPENDED_ROUTE,
} from '@/lib/workspace-suspended'

type Rejected = (error: unknown) => Promise<unknown>

function responseRejected(): Rejected {
  const handlers = (http.interceptors.response as unknown as { handlers: { rejected: Rejected }[] })
    .handlers
  return handlers[0].rejected
}

function forbidden(code: string) {
  return {
    config: { url: '/crm/leads', headers: {} },
    response: { status: 403, data: { code } },
  }
}

describe('http interceptor ORGANIZATION_NOT_ACTIVE', () => {
  it('403 ORGANIZATION_NOT_ACTIVE → event workspace:suspended', async () => {
    const listener = vi.fn()
    window.addEventListener(WORKSPACE_SUSPENDED_EVENT, listener)
    await expect(responseRejected()(forbidden('ORGANIZATION_NOT_ACTIVE'))).rejects.toBeTruthy()
    window.removeEventListener(WORKSPACE_SUSPENDED_EVENT, listener)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('403 lain tidak memicu redirect', async () => {
    const listener = vi.fn()
    window.addEventListener(WORKSPACE_SUSPENDED_EVENT, listener)
    await expect(responseRejected()(forbidden('FORBIDDEN'))).rejects.toBeTruthy()
    window.removeEventListener(WORKSPACE_SUSPENDED_EVENT, listener)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('redirectToSuspended', () => {
  it('redirect sekali; diabaikan bila sudah di halaman ditangguhkan', () => {
    const replace = vi.fn()
    const currentRoute = ref<{ name?: string }>({ name: 'dashboard' })
    const router = { replace, currentRoute } as never
    redirectToSuspended(router)
    expect(replace).toHaveBeenCalledWith({ name: WORKSPACE_SUSPENDED_ROUTE })

    currentRoute.value = { name: WORKSPACE_SUSPENDED_ROUTE }
    redirectToSuspended(router)
    expect(replace).toHaveBeenCalledTimes(1)
  })
})
