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

export type RelatedEntityType = 'lead' | 'contact'
export type ConversationStatus = 'open' | 'closed'
export type MessageDirection = 'in' | 'out'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

// Mirrors backend internal/modules/whatsapp/dto/conversation.go.
export interface WhatsAppConversation {
  id: string
  session_id: string
  phone?: string
  contact_name?: string
  related_entity_type?: RelatedEntityType
  related_entity_id?: string
  assignee_user_id?: string
  last_message_at?: string
  last_message_preview?: string
  unread_count: number
  status: ConversationStatus
  created_at: string
  updated_at: string
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  direction: MessageDirection
  body: string
  has_media: boolean
  status: MessageStatus
  error?: string
  sent_by_user_id?: string
  sent_at: string
}

export interface MessagePage {
  /** Oldest first. */
  messages: WhatsAppMessage[]
  /** Cursor for older messages; absent when there are none. */
  next_before?: string
}

export interface ConversationListParams {
  related_entity_type?: RelatedEntityType
  related_entity_id?: string
  status?: ConversationStatus
  page?: number
  per_page?: number
}

export interface StartConversationPayload {
  session_id?: string
  related_entity_type: RelatedEntityType
  related_entity_id: string
}
