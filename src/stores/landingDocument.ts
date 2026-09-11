import { ref } from 'vue'
import { defineStore } from 'pinia'

import { landingApi } from '@/features/landing/shared/api/landing.api'

/**
 * The GrapesJS working copy of one landing page (builder === 'grapesjs').
 * Thin by design: GrapesJS owns undo/redo and the canvas; this store only
 * carries the last editor snapshot, debounced autosave to
 * `PUT /admin/landing-pages/:id/document`, and publish.
 */

const AUTOSAVE_DELAY_MS = 1500

interface EditorSnapshot {
  project: Record<string, unknown>
  html: string
  css: string
}

function apiMessage(error: unknown, fallback: string): string {
  const res = (error as { response?: { data?: { message?: string } } })?.response
  return res?.data?.message ?? fallback
}

export const useLandingDocumentStore = defineStore('landingDocument', () => {
  const pageId = ref('')
  const project = ref<Record<string, unknown>>({})
  const html = ref('')
  const css = ref('')

  const loading = ref(false)
  const loadError = ref('')
  const saving = ref(false)
  const saveError = ref('')
  const dirty = ref(false)
  const lastSavedAt = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlightPromise: Promise<void> | null = null
  let pendingResave = false

  async function load(id: string) {
    pageId.value = id
    loading.value = true
    loadError.value = ''
    dirty.value = false
    try {
      const res = await landingApi.getDocument(id)
      project.value = res.data.project ?? {}
      html.value = res.data.html ?? ''
      css.value = res.data.css ?? ''
      lastSavedAt.value = res.data.updated_at || null
    } catch (error) {
      loadError.value = apiMessage(error, 'Gagal memuat dokumen.')
    } finally {
      loading.value = false
    }
  }

  /** Called by the editor on every change — records the snapshot and schedules a save. */
  function applyEditorSnapshot(snapshot: EditorSnapshot) {
    project.value = snapshot.project
    html.value = snapshot.html
    css.value = snapshot.css
    dirty.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
  }

  /**
   * Runs one save call, then — if another change came in while it was in
   * flight — chains straight into a resave before resolving. This is what lets
   * `save()` return a promise that only settles once the LATEST edits are
   * actually persisted, instead of resolving the instant a call happens to
   * land while a previous one is still in flight (which used to let
   * `publish()` race ahead of an unsaved deletion — see landingDocument bug
   * notes).
   */
  async function performSave(): Promise<void> {
    saving.value = true
    saveError.value = ''
    const payload = { project: project.value, html: html.value, css: css.value }
    let succeeded = false
    try {
      const res = await landingApi.saveDocument(pageId.value, payload)
      lastSavedAt.value = res.data.updated_at || new Date().toISOString()
      dirty.value = false
      succeeded = true
    } catch (error) {
      saveError.value = apiMessage(error, 'Gagal menyimpan dokumen.')
    } finally {
      saving.value = false
    }
    // A resave was requested while this call was in flight: whatever arrived
    // may not be what `payload` above actually sent (dirty was already true,
    // so it just got cleared without the newer edit's content), so send it for
    // real — unless this attempt itself failed, in which case don't compound
    // errors; the next debounce/explicit save() call will retry.
    if (pendingResave) {
      pendingResave = false
      if (succeeded) await performSave()
    }
  }

  async function save(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pageId.value || !dirty.value) return
    if (inFlightPromise) {
      pendingResave = true
      return inFlightPromise
    }
    inFlightPromise = performSave().finally(() => {
      inFlightPromise = null
    })
    return inFlightPromise
  }

  /**
   * Flushes any pending/in-flight save (waiting for the full chain above, not
   * just the call that happened to be in flight) and only then publishes. If
   * that flush ends in an error, publish is aborted — publishing on top of a
   * failed save would snapshot stale content.
   */
  async function publish() {
    await save()
    if (saveError.value) {
      throw new Error(saveError.value)
    }
    return landingApi.publishPage(pageId.value)
  }

  function reset() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    pageId.value = ''
    project.value = {}
    html.value = ''
    css.value = ''
    loading.value = false
    loadError.value = ''
    saving.value = false
    saveError.value = ''
    dirty.value = false
    lastSavedAt.value = null
    inFlightPromise = null
    pendingResave = false
  }

  return {
    pageId,
    project,
    html,
    css,
    loading,
    loadError,
    saving,
    saveError,
    dirty,
    lastSavedAt,
    load,
    applyEditorSnapshot,
    save,
    publish,
    reset,
  }
})
