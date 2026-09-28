export type MailSecurity = 'ssl' | 'starttls'
export type MailboxStatus = 'active' | 'error' | 'disabled'

export interface Mailbox {
  id: string
  email_address: string
  display_name: string
  username: string
  smtp_host: string
  smtp_port: number
  smtp_security: MailSecurity
  imap_host: string
  imap_port: number
  imap_security: MailSecurity | ''
  status: MailboxStatus
  last_error: string
  created_at: string
  updated_at: string
}

export interface MailboxPayload {
  email_address: string
  display_name?: string
  username?: string
  /** Required on create; omit on update to keep the stored password. */
  password?: string
  smtp_host: string
  smtp_port: number
  smtp_security: MailSecurity
  imap_host?: string
  imap_port?: number
  imap_security?: MailSecurity | ''
}

export type EmailDirection = 'inbound' | 'outbound'
export type EmailStatus = 'queued' | 'sent' | 'failed' | 'received'
export type EmailEntityType = 'lead' | 'contact'

export interface EmailAttachment {
  id: string
  filename: string
  mime_type: string
  size_bytes: number
}

export interface EmailMessage {
  id: string
  mailbox_id: string
  direction: EmailDirection
  status: EmailStatus
  message_id: string
  in_reply_to?: string
  from_address: string
  from_name?: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  snippet: string
  /** Only on detail and send responses. */
  body_html?: string
  error?: string
  related_entity_type?: EmailEntityType
  related_entity_id?: string
  sent_at: string | null
  created_at: string
  attachments: EmailAttachment[]
}

export interface EmailListParams {
  page: number
  per_page: number
  mailbox_id?: string
  participant?: string
  direction?: EmailDirection
  related_entity_type?: EmailEntityType
  related_entity_id?: string
}

export interface SendEmailPayload {
  mailboxId: string
  /** Same key on a retried submit returns the first message (no resend). */
  idempotencyKey: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  bodyHtml: string
  inReplyTo?: string
  relatedEntityType?: EmailEntityType
  relatedEntityId?: string
  files: File[]
}
