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
  let inFlight = false
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

  async function save() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pageId.value || !dirty.value) return
    if (inFlight) {
      pendingResave = true
      return
    }
    inFlight = true
    saving.value = true
    saveError.value = ''
    const payload = { project: project.value, html: html.value, css: css.value }
    try {
      const res = await landingApi.saveDocument(pageId.value, payload)
      lastSavedAt.value = res.data.updated_at || new Date().toISOString()
      dirty.value = false
    } catch (error) {
      saveError.value = apiMessage(error, 'Gagal menyimpan dokumen.')
    } finally {
      saving.value = false
      inFlight = false
      if (pendingResave) {
        pendingResave = false
        if (dirty.value) void save()
      }
    }
  }

  /** Force any pending save, then publish. */
  async function publish() {
    await save()
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
    inFlight = false
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
