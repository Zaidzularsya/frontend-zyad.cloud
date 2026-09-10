import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { landingApi } from '@/features/landing/shared/api/landing.api'
import { blockById } from '@/features/landing/shared/blocks/catalog'
import type { LandingPage, LandingSection } from '@/features/landing/shared/types/landing.types'

/**
 * FROZEN — working buffer for the legacy section builder canvas
 * (page.builder === 'sections'). Kept so pre-pivot pages stay editable; new
 * pages use `stores/landingDocument.ts` + GrapesJS. No new features here.
 *
 * Holds section data in Pinia rather than TanStack Query: it is an editor
 * document with undo/redo, dirty tracking and debounced autosave — client
 * state, not a passive server cache. The server copy is re-adopted on every
 * load/save.
 */

const AUTOSAVE_DELAY_MS = 2000
const HISTORY_LIMIT = 50
const TEMP_ID_PREFIX = 'tmp_'

type BuilderSection = LandingSection

function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX)
}

function tempId(): string {
  return `${TEMP_ID_PREFIX}${Math.random().toString(36).slice(2, 10)}`
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function reindex(sections: BuilderSection[]): BuilderSection[] {
  return sections.map((section, index) => ({ ...section, sort_order: (index + 1) * 10 }))
}

function serialize(sections: BuilderSection[]): string {
  return JSON.stringify(
    sections.map((s) => ({
      id: isTempId(s.id) ? '' : s.id,
      key: s.key,
      type: s.type,
      name: s.name,
      is_enabled: s.is_enabled,
      content: s.content,
      style: s.style,
    })),
  )
}

export const useLandingBuilderStore = defineStore('landingBuilder', () => {
  const pageId = ref('')
  const page = ref<LandingPage | null>(null)
  const sections = ref<BuilderSection[]>([])
  const baseline = ref<BuilderSection[]>([])
  const selectedId = ref<string | null>(null)

  const loading = ref(false)
  const loadError = ref('')
  const saving = ref(false)
  const saveError = ref('')
  const lastSavedAt = ref<number | null>(null)

  const past = ref<BuilderSection[][]>([])
  const future = ref<BuilderSection[][]>([])

  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  const dirty = computed(() => serialize(sections.value) !== serialize(baseline.value))
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const selectedSection = computed(
    () => sections.value.find((section) => section.id === selectedId.value) ?? null,
  )

  function cancelAutosave() {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  function scheduleAutosave() {
    cancelAutosave()
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null
      void persist('autosave')
    }, AUTOSAVE_DELAY_MS)
  }

  /** Snapshot current sections onto the undo stack before a mutation. */
  function commit() {
    past.value.push(clone(sections.value))
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    future.value = []
  }

  function uniqueKey(prefix: string): string {
    const used = new Set(sections.value.map((section) => section.key))
    let n = 1
    while (used.has(`${prefix}-${n}`)) n += 1
    return `${prefix}-${n}`
  }

  function select(id: string | null) {
    selectedId.value = id
  }

  async function load(id: string) {
    cancelAutosave()
    pageId.value = id
    loading.value = true
    loadError.value = ''
    selectedId.value = null
    past.value = []
    future.value = []
    try {
      const [pageResponse, sectionResponse] = await Promise.all([
        landingApi.getPage(id),
        landingApi.getSections(id),
      ])
      page.value = pageResponse.data
      sections.value = reindex(sectionResponse.data)
      baseline.value = clone(sections.value)
    } catch (error) {
      console.error('landingBuilder: load failed', error)
      loadError.value = 'Gagal memuat konten halaman.'
    } finally {
      loading.value = false
    }
  }

  function insertBlock(blockId: string, index: number) {
    const block = blockById(blockId)
    if (!block) return
    commit()
    const section: BuilderSection = {
      id: tempId(),
      key: uniqueKey(block.keyPrefix),
      type: block.sectionType,
      name: block.label,
      sort_order: 0,
      is_enabled: true,
      content: clone(block.defaultContent),
      style: clone(block.defaultStyle),
      created_at: '',
      updated_at: '',
      variant: block.variant,
    }
    const at = Math.max(0, Math.min(index, sections.value.length))
    sections.value.splice(at, 0, section)
    sections.value = reindex(sections.value)
    selectedId.value = section.id
    scheduleAutosave()
  }

  function removeBlock(id: string) {
    if (!sections.value.some((section) => section.id === id)) return
    commit()
    sections.value = reindex(sections.value.filter((section) => section.id !== id))
    if (selectedId.value === id) selectedId.value = null
    scheduleAutosave()
  }

  function duplicateBlock(id: string) {
    const index = sections.value.findIndex((section) => section.id === id)
    if (index === -1) return
    const source = sections.value[index]!
    commit()
    const copy: BuilderSection = {
      ...clone(source),
      id: tempId(),
      key: uniqueKey(source.key.replace(/-\d+$/, '') || source.type),
      name: `${source.name} (salinan)`,
      created_at: '',
      updated_at: '',
    }
    sections.value.splice(index + 1, 0, copy)
    sections.value = reindex(sections.value)
    selectedId.value = copy.id
    scheduleAutosave()
  }

  function reorder(orderedIds: string[]) {
    const byId = new Map(sections.value.map((section) => [section.id, section]))
    const next = orderedIds
      .map((id) => byId.get(id))
      .filter((section): section is BuilderSection => Boolean(section))
    if (next.length !== sections.value.length) return
    commit()
    sections.value = reindex(next)
    scheduleAutosave()
  }

  function patchSection(
    id: string,
    patch: Partial<Pick<BuilderSection, 'name' | 'is_enabled' | 'content' | 'style' | 'variant'>>,
  ) {
    const index = sections.value.findIndex((section) => section.id === id)
    if (index === -1) return
    commit()
    sections.value[index] = { ...sections.value[index], ...patch } as BuilderSection
    scheduleAutosave()
  }

  function undo() {
    const previous = past.value.pop()
    if (!previous) return
    future.value.push(clone(sections.value))
    sections.value = previous
    scheduleAutosave()
  }

  function redo() {
    const next = future.value.pop()
    if (!next) return
    past.value.push(clone(sections.value))
    sections.value = next
    scheduleAutosave()
  }

  function applySaved(serverSections: BuilderSection[]) {
    const serverKeys = new Set(serverSections.map((section) => section.key))
    // Keep blocks the user added while the request was in flight.
    const pendingNew = sections.value.filter(
      (section) => isTempId(section.id) && !serverKeys.has(section.key),
    )
    sections.value = reindex([...serverSections, ...pendingNew])
    baseline.value = clone(reindex(serverSections))
    lastSavedAt.value = Date.now()
  }

  let pendingResave = false

  async function persist(mode: 'save' | 'autosave') {
    cancelAutosave()
    if (!pageId.value) return
    if (saving.value) {
      // An edit landed mid-flight; re-run once the current request settles.
      pendingResave = true
      return
    }
    if (!dirty.value) return
    saving.value = true
    saveError.value = ''
    const payload = { sections: JSON.parse(serialize(sections.value)) as unknown[] }
    try {
      const response =
        mode === 'autosave'
          ? await landingApi.autosaveSections(pageId.value, payload)
          : await landingApi.bulkReplaceSections(pageId.value, payload)
      applySaved(response.data)
    } catch (error) {
      console.error(`landingBuilder: ${mode} failed`, error)
      saveError.value = 'Perubahan gagal disimpan.'
    } finally {
      saving.value = false
      if (pendingResave && dirty.value) {
        pendingResave = false
        void persist(mode)
      } else {
        pendingResave = false
      }
    }
  }

  function save() {
    return persist('save')
  }

  /** Force any pending autosave to run now (e.g. before opening Preview). */
  async function flush() {
    if (autosaveTimer || dirty.value) await persist('save')
  }

  async function publish() {
    await flush()
    if (!pageId.value) return
    await landingApi.publishPage(pageId.value)
  }

  function reset() {
    cancelAutosave()
    pageId.value = ''
    page.value = null
    sections.value = []
    baseline.value = []
    selectedId.value = null
    past.value = []
    future.value = []
    saveError.value = ''
    loadError.value = ''
    lastSavedAt.value = null
  }

  return {
    pageId,
    page,
    sections,
    selectedId,
    loading,
    loadError,
    saving,
    saveError,
    lastSavedAt,
    dirty,
    canUndo,
    canRedo,
    selectedSection,
    load,
    select,
    insertBlock,
    removeBlock,
    duplicateBlock,
    reorder,
    patchSection,
    undo,
    redo,
    save,
    flush,
    publish,
    reset,
  }
})
