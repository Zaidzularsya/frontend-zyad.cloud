import { http } from '@/lib/http'

import type {
  CreateSessionPayload,
  SessionQR,
  UpdateSessionPayload,
  WhatsAppSession,
} from '@/features/whatsapp/types'

type Envelope<T> = { success: boolean; data: T }

const base = '/app/whatsapp/sessions'

// Endpoints: backend/docs/reference-whatsapp.md "Session API (Fase 4)".
export const whatsappApi = {
  listSessions: () =>
    http.get<Envelope<WhatsAppSession[]>>(base).then((response) => response.data.data),

  createSession: (payload: CreateSessionPayload) =>
    http.post<Envelope<WhatsAppSession>>(base, payload).then((response) => response.data.data),

  updateSession: (id: string, payload: UpdateSessionPayload) =>
    http
      .patch<Envelope<WhatsAppSession>>(`${base}/${id}`, payload)
      .then((response) => response.data.data),

  deleteSession: (id: string) => http.delete(`${base}/${id}`).then(() => undefined),

  /** Re-reads WAHA when the stored status is older than ~15s. */
  sessionStatus: (id: string) =>
    http
      .get<Envelope<WhatsAppSession>>(`${base}/${id}/status`)
      .then((response) => response.data.data),

  startSession: (id: string) =>
    http
      .post<Envelope<WhatsAppSession>>(`${base}/${id}/start`)
      .then((response) => response.data.data),

  stopSession: (id: string) =>
    http
      .post<Envelope<WhatsAppSession>>(`${base}/${id}/stop`)
      .then((response) => response.data.data),

  logoutSession: (id: string) =>
    http
      .post<Envelope<WhatsAppSession>>(`${base}/${id}/logout`)
      .then((response) => response.data.data),

  /** 409 WHATSAPP_SESSION_NOT_SCANNING unless the session waits for a scan. */
  sessionQR: (id: string) =>
    http.get<Envelope<SessionQR>>(`${base}/${id}/qr`).then((response) => response.data.data),

  requestPairingCode: (id: string, phone: string) =>
    http
      .post<Envelope<{ code: string }>>(`${base}/${id}/pairing-code`, { phone })
      .then((response) => response.data.data.code),
}
