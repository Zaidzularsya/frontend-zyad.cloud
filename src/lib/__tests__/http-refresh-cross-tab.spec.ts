import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', async (orig) => {
  const mod = (await orig()) as { env: Record<string, unknown> }
  return { env: { ...mod.env, VITE_AUTH_MODE: 'bearer' } }
})

import { http, refreshAccessToken } from '@/lib/http'
import { tokenStorage } from '@/lib/auth'

type Rejected = (error: unknown) => Promise<unknown>

function responseRejected(): Rejected {
  const handlers = (http.interceptors.response as unknown as { handlers: { rejected: Rejected }[] })
    .handlers
  return handlers[0].rejected
}

function unauthorizedWith(token: string) {
  return {
    config: { url: '/crm/leads', method: 'post', headers: { Authorization: `Bearer ${token}` } },
    response: { status: 401, data: { code: 'AUTH_TOKEN_EXPIRED' } },
  }
}

// The backend rotates the refresh token and revokes the whole session when an
// already-rotated token is presented again (refresh_token_reuse). Tabs share
// localStorage, so a second tab refreshing with the old token logs everyone out.
describe('refresh across tabs', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('retries with the token another tab already stored instead of refreshing again', async () => {
    tokenStorage.set('access-new')
    tokenStorage.setRefreshToken('refresh-new')
    const post = vi.spyOn(http, 'post')
    const adapter = vi.fn().mockResolvedValue({ data: 'ok', status: 200, headers: {}, config: {} })
    const previousAdapter = http.defaults.adapter
    http.defaults.adapter = adapter

    await responseRejected()(unauthorizedWith('access-old'))
    http.defaults.adapter = previousAdapter

    expect(post).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0]?.[0].headers.Authorization).toBe('Bearer access-new')
  })

  it('does not send a refresh token that another tab rotated while waiting for the lock', async () => {
    tokenStorage.set('access-old')
    tokenStorage.setRefreshToken('refresh-old')
    // Another tab holds the lock and rotates the tokens before releasing it.
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: {
        request: async (_name: string, cb: () => Promise<unknown>) => {
          tokenStorage.set('access-rotated')
          tokenStorage.setRefreshToken('refresh-rotated')
          return cb()
        },
      },
    })
    const post = vi.spyOn(http, 'post')

    await expect(refreshAccessToken()).resolves.toBe('access-rotated')
    expect(post).not.toHaveBeenCalled()
  })
})
