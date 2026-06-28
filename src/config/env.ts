import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_NAME: z.string().default('Zyad Cloud CRM'),
  VITE_API_BASE_URL: z.string().url().default('http://localhost:8080/api/v1'),
  VITE_AUTH_MODE: z.enum(['cookie', 'bearer']).default('cookie'),
  VITE_TENANT_HEADER: z.string().default('X-Organization-ID'),
  VITE_GOOGLE_CLIENT_ID: z.string().default(''),
})

export const env = envSchema.parse(import.meta.env)
