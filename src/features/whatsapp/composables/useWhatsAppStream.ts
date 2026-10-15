import { useQueryClient, type QueryClient } from '@tanstack/vue-query'
import { computed, onBeforeUnmount, watch, type Ref } from 'vue'

import { openWhatsAppStream, StreamHttpError } from '@/features/whatsapp/api/whatsapp.stream'
import type { WhatsAppStreamEvent } from '@/features/whatsapp/api/whatsapp.stream'
import { whatsappStreamConnected } from '@/features/whatsapp/api/whatsapp.stream-state'
import { whatsappKeys } from '@/features/whatsapp/api/whatsapp.queries'
import { useDocumentVisible } from '@/features/whatsapp/composables/useDocumentVisible'
import { refreshAccessToken } from '@/lib/http'
import type { RelatedEntityType } from '@/features/whatsapp/types'

const MAX_BACKOFF_MS = 30_000

function backoff(attempt: number) {
  const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt)
  return base / 2 + Math.random() * (base / 2) // jitter so clients do not reconnect in lockstep
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/** Turns a change hint into refetches of exactly the queries it affects. */
export function applyStreamEvent(queryClient: QueryClient, event: WhatsAppStreamEvent) {
  if (event.type === 'message' || event.type === 'ack') {
    void queryClient.invalidateQueries({ queryKey: whatsappKeys.messages(event.conversation_id) })
  }
  if (event.related_entity_type && event.related_entity_id) {
    void queryClient.invalidateQueries({
      queryKey: whatsappKeys.entityConversation(
        event.related_entity_type as RelatedEntityType,
        event.related_entity_id,
      ),
    })
  } else {
    void queryClient.invalidateQueries({ queryKey: whatsappKeys.entityConversations() })
  }
}

/**
 * Keeps one realtime stream open while `enabled` and the browser tab is
 * visible, and invalidates the affected queries per event. Delivery is
 * at-most-once, so everything is refetched on every (re)connect. While it is
 * not connected the queries poll slowly (see whatsappStreamConnected).
 */
export function useWhatsAppStream(enabled: Ref<boolean>) {
  const queryClient = useQueryClient()
  const visible = useDocumentVisible()
  const active = computed(() => enabled.value && visible.value)
  let controller: AbortController | null = null

  async function run(signal: AbortSignal) {
    let attempt = 0
    let refreshed = false
    while (!signal.aborted) {
      try {
        await openWhatsAppStream({
          signal,
          onOpen: () => {
            whatsappStreamConnected.value = true
            attempt = 0
            refreshed = false
            void queryClient.invalidateQueries({ queryKey: whatsappKeys.entityConversations() })
            void queryClient.invalidateQueries({ queryKey: whatsappKeys.allMessages() })
          },
          onEvent: (event) => applyStreamEvent(queryClient, event),
        })
      } catch (error) {
        if (signal.aborted) return
        if (error instanceof StreamHttpError) {
          if (error.status === 401 && !refreshed) {
            refreshed = true
            try {
              await refreshAccessToken()
              continue
            } catch {
              whatsappStreamConnected.value = false
              return // session expired: the http layer already signalled auth:expired
            }
          }
          const permanent =
            error.status >= 400 &&
            error.status < 500 &&
            error.status !== 408 &&
            error.status !== 429
          if (permanent) {
            whatsappStreamConnected.value = false
            return // e.g. no entitlement/permission: keep the polling fallback
          }
        }
      }
      whatsappStreamConnected.value = false
      await sleep(backoff(attempt++), signal)
    }
  }

  function start() {
    if (controller) return
    controller = new AbortController()
    void run(controller.signal)
  }

  function stop() {
    controller?.abort()
    controller = null
    whatsappStreamConnected.value = false
  }

  watch(active, (on) => (on ? start() : stop()), { immediate: true })
  onBeforeUnmount(stop)

  return { connected: whatsappStreamConnected }
}
