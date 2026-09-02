import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_NAME: z.string().default('Zyad Cloud CRM'),
  VITE_API_BASE_URL: z.string().url().default('http://localhost:8080/api/v1'),
  VITE_AUTH_MODE: z.enum(['cookie', 'bearer']).default('cookie'),
  VITE_TENANT_HEADER: z.string().default('X-Organization-ID'),
  VITE_GOOGLE_CLIENT_ID: z.string().default(''),
})

export const env = envSchema.parse(import.meta.env)

// Host tempat dashboard/marketing platform sendiri berjalan, diturunkan dari
// API base URL (mis. "api.zyad.cloud" -> "zyad.cloud") supaya tidak hardcode
// nama domain di kode — dipakai untuk membedakan request di host platform vs
// host domain tenant (subdomain/custom domain yang di-bind ke landing page).
export const platformHost = (() => {
  const apiHost = new URL(env.VITE_API_BASE_URL).hostname
  const labels = apiHost.split('.')
  return labels.length > 2 && labels[0] === 'api' ? labels.slice(1).join('.') : apiHost
})()
