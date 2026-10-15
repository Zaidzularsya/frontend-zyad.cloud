import { env } from '@/config/env'
import { tokenStorage } from '@/lib/auth'
import { tenantStorage } from '@/lib/tenant'

/** Change hint from GET /app/whatsapp/stream; ids only, state is re-read via the API. */
export interface WhatsAppStreamEvent {
  type: 'message' | 'ack' | 'read' | 'conversation'
  conversation_id: string
  message_id?: string
  related_entity_type?: string
  related_entity_id?: string
}

export class StreamHttpError extends Error {
  constructor(readonly status: number) {
    super(`whatsapp stream: HTTP ${status}`)
  }
}

interface SSEMessage {
  event: string
  data: string
}

/** Incremental SSE parser: feed decoded chunks, get one callback per complete event. */
export function createSSEParser(onMessage: (message: SSEMessage) => void) {
  let buffer = ''
  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, '\n')
    let end = buffer.indexOf('\n\n')
    while (end >= 0) {
      const block = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (!line || line.startsWith(':')) continue // comment / heartbeat
        const colon = line.indexOf(':')
        const field = colon < 0 ? line : line.slice(0, colon)
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
        if (field === 'event') event = value
        else if (field === 'data') data.push(value)
      }
      if (data.length > 0) onMessage({ event, data: data.join('\n') })
      end = buffer.indexOf('\n\n')
    }
  }
}

/**
 * Opens the SSE stream with fetch (EventSource cannot send the Authorization
 * and tenant headers). Resolves when the server ends the stream; rejects on a
 * network error or a non-2xx response (StreamHttpError). Aborting via `signal`
 * rejects with an AbortError.
 */
export async function openWhatsAppStream(options: {
  signal: AbortSignal
  onOpen: () => void
  onEvent: (event: WhatsAppStreamEvent) => void
}): Promise<void> {
  const headers: Record<string, string> = { Accept: 'text/event-stream' }
  const token = tokenStorage.get()
  const tenantId = tenantStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (tenantId) headers[env.VITE_TENANT_HEADER] = tenantId

  const response = await fetch(`${env.VITE_API_BASE_URL}/app/whatsapp/stream`, {
    headers,
    credentials: env.VITE_AUTH_MODE === 'cookie' ? 'include' : 'same-origin',
    signal: options.signal,
  })
  if (!response.ok || !response.body) throw new StreamHttpError(response.status)

  options.onOpen()
  const parse = createSSEParser((message) => {
    if (message.event !== 'wa') return
    try {
      options.onEvent(JSON.parse(message.data) as WhatsAppStreamEvent)
    } catch {
      // Malformed hint: ignore; the next event or the reconnect refetch recovers.
    }
  })
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    parse(decoder.decode(value, { stream: true }))
  }
}
