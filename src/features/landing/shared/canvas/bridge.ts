import type { LandingSection } from '@/features/landing/shared/types/landing.types'

/**
 * postMessage protocol between the visual builder shell (parent) and the
 * WYSIWYG canvas iframe (`/landing-canvas/:pageId`).
 *
 * Both windows are served by the same SPA on the same origin, so every message
 * is validated against `window.location.origin`. `type` is namespaced with
 * `canvas:` so unrelated postMessage traffic (Vite HMR, extensions) is ignored.
 */

export interface CanvasSetSectionsMessage {
  type: 'canvas:set-sections'
  sections: LandingSection[]
}

export interface CanvasSetSelectedMessage {
  type: 'canvas:set-selected'
  id: string | null
}

export interface CanvasSetDeviceMessage {
  type: 'canvas:set-device'
  /** Target viewport width in px, or null for full width. */
  width: number | null
}

/** parent -> iframe */
export type CanvasInboundMessage =
  | CanvasSetSectionsMessage
  | CanvasSetSelectedMessage
  | CanvasSetDeviceMessage

export interface CanvasReadyMessage {
  type: 'canvas:ready'
}

export interface CanvasSelectMessage {
  type: 'canvas:select'
  id: string | null
}

export interface CanvasReorderMessage {
  type: 'canvas:reorder'
  orderedIds: string[]
}

export interface CanvasRequestInsertMessage {
  type: 'canvas:request-insert'
  blockId: string
  index: number
}

export interface CanvasRequestDeleteMessage {
  type: 'canvas:request-delete'
  id: string
}

export interface CanvasInlineEditMessage {
  type: 'canvas:inline-edit'
  id: string
  key: string
  value: string
}

export interface CanvasSizeMessage {
  type: 'canvas:size'
  height: number
}

/** iframe -> parent */
export type CanvasOutboundMessage =
  | CanvasReadyMessage
  | CanvasSelectMessage
  | CanvasReorderMessage
  | CanvasRequestInsertMessage
  | CanvasRequestDeleteMessage
  | CanvasInlineEditMessage
  | CanvasSizeMessage

export type CanvasMessage = CanvasInboundMessage | CanvasOutboundMessage

const CANVAS_PREFIX = 'canvas:'

function sameOriginTarget(): string {
  return typeof window !== 'undefined' ? window.location.origin : '*'
}

/** Type guard: a MessageEvent that carries one of our canvas messages. */
export function isCanvasMessage(event: MessageEvent): event is MessageEvent<CanvasMessage> {
  if (typeof window !== 'undefined' && event.origin !== window.location.origin) return false
  const data = event.data as { type?: unknown } | null
  return Boolean(data && typeof data.type === 'string' && data.type.startsWith(CANVAS_PREFIX))
}

/** Send a message from the iframe up to the builder shell. */
export function postToParent(message: CanvasOutboundMessage): void {
  if (typeof window === 'undefined' || window.parent === window) return
  window.parent.postMessage(message, sameOriginTarget())
}

/** Send a message from the builder shell down into the canvas iframe. */
export function postToFrame(frame: Window | null | undefined, message: CanvasInboundMessage): void {
  if (!frame) return
  frame.postMessage(message, sameOriginTarget())
}

/**
 * Subscribe to canvas messages on `window`. Returns an unsubscribe function.
 * `handler` only receives validated, same-origin, `canvas:`-prefixed messages.
 */
export function onCanvasMessage<T extends CanvasMessage = CanvasMessage>(
  handler: (message: T, event: MessageEvent<T>) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: MessageEvent) => {
    if (!isCanvasMessage(event)) return
    handler(event.data as T, event as MessageEvent<T>)
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
