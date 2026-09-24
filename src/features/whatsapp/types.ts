// Mirrors backend/internal/modules/whatsapp/dto/session.go.
export type SessionStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'SCAN_QR_CODE'
  | 'PASSKEY_REQUIRED'
  | 'PASSKEY_CONFIRMATION_REQUIRED'
  | 'WORKING'
  | 'FAILED'

export type SessionPurpose = 'sales' | 'cs' | 'notification'

export interface WhatsAppSession {
  id: string
  display_name?: string
  /** Normalized number without "+", e.g. 6281234567890; set once connected. */
  phone?: string
  push_name?: string
  status: SessionStatus
  engine?: string
  is_default: boolean
  purpose: SessionPurpose
  auto_create_lead: boolean
  last_status_at?: string
  created_at: string
  updated_at: string
}

export interface CreateSessionPayload {
  display_name?: string
  purpose: SessionPurpose
  is_default?: boolean
  auto_create_lead: boolean
}

export interface UpdateSessionPayload {
  display_name?: string
  purpose?: SessionPurpose
  is_default?: boolean
  auto_create_lead?: boolean
}

export interface SessionQR {
  /** data:image/png;base64,... usable directly as <img src>. */
  qr: string
  status: SessionStatus
}
