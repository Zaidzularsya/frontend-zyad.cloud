import { env } from '@/config/env'

const ACCESS_TOKEN_KEY = 'zyad.access-token'

export const tokenStorage = {
  get() {
    return env.VITE_AUTH_MODE === 'bearer' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null
  },
  set(token?: string) {
    if (env.VITE_AUTH_MODE !== 'bearer') return
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
    else localStorage.removeItem(ACCESS_TOKEN_KEY)
  },
}
