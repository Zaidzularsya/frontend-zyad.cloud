import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

import type {
  EmailListParams,
  EmailMessage,
  Mailbox,
  MailboxPayload,
  SendEmailPayload,
} from '@/features/email/types'

type Envelope<T> = { success: boolean; data: T }

const mailboxesBase = '/app/mailboxes'
const emailsBase = '/app/emails'

export const emailApi = {
  listMailboxes: () =>
    http.get<Envelope<Mailbox[]>>(mailboxesBase).then((response) => response.data.data),

  /** The backend verifies the SMTP login before saving. */
  createMailbox: (payload: MailboxPayload) =>
    http.post<Envelope<Mailbox>>(mailboxesBase, payload).then((response) => response.data.data),

  updateMailbox: (id: string, payload: MailboxPayload) =>
    http
      .patch<Envelope<Mailbox>>(`${mailboxesBase}/${id}`, payload)
      .then((response) => response.data.data),

  deleteMailbox: (id: string) => http.delete(`${mailboxesBase}/${id}`).then(() => undefined),

  testMailbox: (id: string) =>
    http
      .post<Envelope<Mailbox>>(`${mailboxesBase}/${id}/test`)
      .then((response) => response.data.data),

  /** 202: the message is queued and delivered in the background. */
  send: (payload: SendEmailPayload) => {
    const form = new FormData()
    payload.to.forEach((address) => form.append('to', address))
    payload.cc.forEach((address) => form.append('cc', address))
    payload.bcc.forEach((address) => form.append('bcc', address))
    form.append('subject', payload.subject)
    form.append('body_html', payload.bodyHtml)
    if (payload.inReplyTo) form.append('in_reply_to', payload.inReplyTo)
    if (payload.relatedEntityType && payload.relatedEntityId) {
      form.append('related_entity_type', payload.relatedEntityType)
      form.append('related_entity_id', payload.relatedEntityId)
    }
    payload.files.forEach((file) => form.append('files', file))
    return http
      .post<Envelope<EmailMessage>>(`${mailboxesBase}/${payload.mailboxId}/messages`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Idempotency-Key': payload.idempotencyKey,
        },
      })
      .then((response) => response.data.data)
  },

  listMessages: async (params: EmailListParams) => {
    const response = await http.get<{
      success: boolean
      data: EmailMessage[]
      meta: PaginatedResponse<EmailMessage>['meta']
    }>(emailsBase, { params })
    return { data: response.data.data, meta: response.data.meta }
  },

  message: (id: string) =>
    http.get<Envelope<EmailMessage>>(`${emailsBase}/${id}`).then((response) => response.data.data),

  attachmentDownloadUrl: (messageId: string, attachmentId: string) =>
    http
      .get<
        Envelope<{ download_url: string }>
      >(`${emailsBase}/${messageId}/attachments/${attachmentId}/download`)
      .then((response) => response.data.data.download_url),
}
