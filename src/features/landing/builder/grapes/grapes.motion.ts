import type { Editor } from 'grapesjs'

import {
  createPageRuntime,
  defaultRuntimeEnv,
  type PageRuntime,
} from '../../renderer/motion/page-runtime'
import motionCss from '../../renderer/motion/zy-motion.css?inline'

/**
 * Animasi di kanvas GrapesJS (R5-S2-T4).
 *
 * Kanvas BUKAN shadow DOM: stylesheet disisipkan ke <head> frame dan runtime memakai
 * `frameDoc.body` sebagai contentRoot. Semua kelas/atribut runtime (`zy-js`, `is-in`,
 * `data-zy-*`, `--zy-*`, klon marquee) ditulis langsung ke DOM kanvas, tidak lewat API
 * komponen GrapesJS, sehingga tidak pernah masuk `editor.getHtml()` / autosave.
 *
 * Aman untuk pengeditan: author tidak boleh kehilangan elemen yang tersembunyi. View
 * GrapesJS menimpa `className` saat kelas komponen berubah, sehingga `is-in` dari runtime
 * bisa hilang kapan saja. Karena itu, di kanvas semua elemen `zy-anim-*` selalu TAMPIL
 * (stylesheet override di bawah) dan efek masuk hanya terlihat saat tombol "Putar animasi"
 * menyalakan atribut `data-zy-replaying` pada body untuk sementara.
 */

export const REPLAY_ATTR = 'data-zy-replaying'
/** Cukup untuk durasi terlama (1200) + delay terbesar (800) + stagger + margin. */
export const REPLAY_WINDOW_MS = 4000

const EDIT_SAFE_CSS = `
body:not([${REPLAY_ATTR}]).zy-js [class*="zy-anim-"]:not(.is-in) {
  opacity: 1 !important;
  transform: none !important;
  clip-path: none !important;
  filter: none !important;
  transition: none !important;
  animation: none !important;
}

/* Anak langsung kontainer stagger disembunyikan CSS lewat induknya, bukan lewat kelas sendiri. */
body:not([${REPLAY_ATTR}]).zy-js .zy-stagger[class*="zy-anim-"]:not(.is-in) > * {
  opacity: 1 !important;
  transform: none !important;
  clip-path: none !important;
  filter: none !important;
  transition: none !important;
  animation: none !important;
}
`

export interface CanvasMotion {
  replay(): void
  refresh(): void
  detach(): void
}

interface FramePayload {
  el?: HTMLIFrameElement
}

export function attachCanvasMotion(editor: Editor): CanvasMotion {
  let runtime: PageRuntime | null = null
  let body: HTMLElement | null = null
  let reducedMotion = false
  let replayTimer: ReturnType<typeof setTimeout> | null = null
  let refreshQueued = false
  let detached = false

  function clearReplayFlag(): void {
    if (replayTimer) clearTimeout(replayTimer)
    replayTimer = null
    body?.removeAttribute(REPLAY_ATTR)
  }

  function teardown(): void {
    clearReplayFlag()
    runtime?.stop()
    runtime = null
    body = null
  }

  function onFrameLoad(payload?: FramePayload): void {
    if (detached) return
    const canvas = (editor as Partial<Editor>).Canvas
    const doc = payload?.el?.contentDocument ?? canvas?.getDocument?.() ?? null
    const win = payload?.el?.contentWindow ?? canvas?.getWindow?.() ?? null
    if (!doc || !win || !doc.body) return

    teardown()
    doc.head.querySelectorAll('style[data-zy-motion]').forEach((n) => n.remove())
    const style = doc.createElement('style')
    style.setAttribute('data-zy-motion', '')
    style.textContent = `${motionCss}\n${EDIT_SAFE_CSS}`
    doc.head.appendChild(style)

    const env = defaultRuntimeEnv(win)
    reducedMotion = env.reducedMotion
    body = doc.body
    runtime = createPageRuntime(doc.body, env)
    runtime.start()
  }

  // View komponen dirender setelah event `component:add`; tunda ke microtask supaya DOM ada.
  function refresh(): void {
    if (refreshQueued || detached) return
    refreshQueued = true
    queueMicrotask(() => {
      refreshQueued = false
      runtime?.refresh()
    })
  }

  function replay(): void {
    if (!runtime || !body || reducedMotion) return
    body.setAttribute(REPLAY_ATTR, '')
    runtime.replay()
    if (replayTimer) clearTimeout(replayTimer)
    replayTimer = setTimeout(clearReplayFlag, REPLAY_WINDOW_MS)
  }

  function detach(): void {
    if (detached) return
    detached = true
    editor.off('canvas:frame:load', onFrameLoad)
    editor.off('canvas:frame:load:body', refresh)
    editor.off('component:add', refresh)
    teardown()
  }

  editor.on('canvas:frame:load', onFrameLoad)
  editor.on('canvas:frame:load:body', refresh)
  editor.on('component:add', refresh)

  return { replay, refresh, detach }
}
