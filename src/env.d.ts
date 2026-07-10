/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_AUTH_MODE?: 'cookie' | 'bearer'
  readonly VITE_TENANT_HEADER?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface GoogleCredentialResponse {
  credential?: string
  select_by?: string
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string
          callback?(response: GoogleCredentialResponse): void
          ux_mode?: 'popup' | 'redirect'
          login_uri?: string
          auto_select?: boolean
          cancel_on_tap_outside?: boolean
        }): void
        renderButton(
          parent: HTMLElement,
          options: {
            type?: 'standard' | 'icon'
            theme?: 'outline' | 'filled_blue' | 'filled_black'
            size?: 'large' | 'medium' | 'small'
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
            shape?: 'rectangular' | 'pill' | 'circle' | 'square'
            logo_alignment?: 'left' | 'center'
            width?: number
          },
        ): void
        cancel(): void
      }
    }
  }
}
