import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/lib/http'

type Rejected = (error: unknown) => Promise<unknown>

function responseRejected(): Rejected {
  const handlers = (http.interceptors.response as unknown as { handlers: { rejected: Rejected }[] })
    .handlers
  return handlers[0].rejected
}

function unauthorized(url: string) {
  return {
    config: { url, headers: {} },
    response: { status: 401, data: { code: 'AUTH_GOOGLE_TOKEN_INVALID' } },
  }
}

describe('http interceptor 401', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(['/public/tenant-checkout', '/api/v1/public/tenant-checkout'])(
    '401 dari endpoint publik %s tidak refresh dan tidak memicu auth:expired',
    async (url) => {
      const post = vi.spyOn(http, 'post')
      const expired = vi.fn()
      window.addEventListener('auth:expired', expired)
      const error = unauthorized(url)
      await expect(responseRejected()(error)).rejects.toBe(error)
      window.removeEventListener('auth:expired', expired)
      expect(post).not.toHaveBeenCalled()
      expect(expired).not.toHaveBeenCalled()
    },
  )

  it('401 dari endpoint biasa tetap mencoba refresh lalu memicu auth:expired bila gagal', async () => {
    const post = vi.spyOn(http, 'post').mockRejectedValue(new Error('refresh failed'))
    const expired = vi.fn()
    window.addEventListener('auth:expired', expired)
    await expect(responseRejected()(unauthorized('/crm/leads'))).rejects.toBeTruthy()
    window.removeEventListener('auth:expired', expired)
    expect(post).toHaveBeenCalledWith('/auth/refresh-token', expect.anything())
    expect(expired).toHaveBeenCalledTimes(1)
  })
})
