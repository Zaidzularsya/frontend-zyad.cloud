/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_AUTH_MODE?: 'cookie' | 'bearer'
  readonly VITE_TENANT_HEADER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
