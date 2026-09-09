import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { landingApi } from '@/features/landing/shared/api/landing.api'
import { hrefForItem } from '@/features/landing/shared/nav/destination'
import type {
  LandingBranding,
  LandingMenu,
  LandingMenuItem,
} from '@/features/landing/shared/types/landing.types'

/**
 * Tenant-wide landing "chrome": the header navigation menu (`landing_menus`
 * location=header + items) and the default brand row (`landing_brandings`).
 * These are shared across every page of the tenant, so they live outside the
 * per-page section autosave buffer (`landingBuilder`). Writes persist
 * immediately to their own admin endpoints.
 */

export interface CanvasNavItem {
  id: string
  label: string
  href: string
  target: string
}

export interface MenuItemPayload {
  label: string
  link_type: string
  destination: string
  target: string
  is_enabled: boolean
  parent_id: string | null
  sort_order?: number
}

function apiMessage(error: unknown, fallback: string): string {
  const res = (error as { response?: { data?: { message?: string }; status?: number } })?.response
  if (res?.status === 403) return 'Anda tidak punya izin mengedit navigasi / brand tenant ini.'
  return res?.data?.message ?? fallback
}

export const useLandingChromeStore = defineStore('landingChrome', () => {
  const headerMenu = ref<LandingMenu | null>(null)
  const navItems = ref<LandingMenuItem[]>([])
  const branding = ref<LandingBranding | null>(null)

  const loading = ref(false)
  const loadError = ref('')
  const saving = ref(false)
  const saveError = ref('')
  const readOnly = ref(false)
  let loadedForOrg = false

  const canvasNav = computed<CanvasNavItem[]>(() =>
    navItems.value
      .filter((item) => item.is_enabled && !item.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        id: item.id,
        label: item.label,
        href: hrefForItem(item),
        target: item.target === 'new_tab' ? '_blank' : '_self',
      })),
  )

  const canvasBranding = computed(() => {
    const b = branding.value
    const colors = (b?.colors ?? {}) as Record<string, string>
    return {
      companyName: b?.company_name ?? '',
      logoUrl: b?.logo_light_url ?? '',
      primary: colors.primary || '#2563EB',
    }
  })

  async function load(force = false) {
    if (loadedForOrg && !force) return
    loading.value = true
    loadError.value = ''
    try {
      const [menusRes, brandingRes] = await Promise.all([
        landingApi.getMenus(),
        landingApi.getDefaultBranding(),
      ])
      const header =
        menusRes.data.find((m) => m.location === 'header' && m.is_active) ??
        menusRes.data.find((m) => m.location === 'header') ??
        null
      headerMenu.value = header
      branding.value = brandingRes.data
      navItems.value = header ? (await landingApi.getMenuItems(header.id)).data : []
      loadedForOrg = true
    } catch (error) {
      loadError.value = apiMessage(error, 'Gagal memuat navigasi & brand.')
    } finally {
      loading.value = false
    }
  }

  async function ensureHeaderMenu(): Promise<string | null> {
    if (headerMenu.value) return headerMenu.value.id
    saving.value = true
    saveError.value = ''
    try {
      const res = await landingApi.createMenu({
        name: 'Header Menu',
        location: 'header',
        is_active: true,
      })
      headerMenu.value = res.data
      navItems.value = []
      return res.data.id
    } catch (error) {
      saveError.value = apiMessage(error, 'Gagal membuat menu header.')
      if (apiMessage(error, '').startsWith('Anda tidak punya izin')) readOnly.value = true
      return null
    } finally {
      saving.value = false
    }
  }

  async function reloadItems() {
    if (!headerMenu.value) return
    navItems.value = (await landingApi.getMenuItems(headerMenu.value.id)).data
  }

  async function addNavItem(payload: MenuItemPayload) {
    const menuId = await ensureHeaderMenu()
    if (!menuId) return
    await run(async () => {
      await landingApi.createMenuItem(menuId, {
        ...payload,
        sort_order: navItems.value.length * 10 + 10,
      })
      await reloadItems()
    }, 'Gagal menambah item navigasi.')
  }

  async function updateNavItem(id: string, payload: MenuItemPayload) {
    if (!headerMenu.value) return
    await run(async () => {
      await landingApi.updateMenuItem(headerMenu.value!.id, id, payload)
      await reloadItems()
    }, 'Gagal menyimpan item navigasi.')
  }

  async function removeNavItem(id: string) {
    if (!headerMenu.value) return
    await run(async () => {
      await landingApi.deleteMenuItem(headerMenu.value!.id, id)
      await reloadItems()
    }, 'Gagal menghapus item navigasi.')
  }

  async function moveNavItem(id: string, direction: -1 | 1) {
    if (!headerMenu.value) return
    const ordered = [...navItems.value].sort((a, b) => a.sort_order - b.sort_order)
    const index = ordered.findIndex((i) => i.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    const [moved] = ordered.splice(index, 1)
    if (!moved) return
    ordered.splice(target, 0, moved)
    await run(async () => {
      await landingApi.reorderMenuItems(headerMenu.value!.id, {
        item_ids: ordered.map((i) => i.id),
      })
      await reloadItems()
    }, 'Gagal mengubah urutan navigasi.')
  }

  async function saveBranding(patch: Partial<LandingBranding>) {
    await run(async () => {
      const res = await landingApi.updateDefaultBranding(patch)
      branding.value = res.data
    }, 'Gagal menyimpan brand.')
  }

  async function run(fn: () => Promise<void>, fallback: string) {
    saving.value = true
    saveError.value = ''
    try {
      await fn()
    } catch (error) {
      saveError.value = apiMessage(error, fallback)
      if (saveError.value.startsWith('Anda tidak punya izin')) readOnly.value = true
    } finally {
      saving.value = false
    }
  }

  function reset() {
    headerMenu.value = null
    navItems.value = []
    branding.value = null
    loadError.value = ''
    saveError.value = ''
    readOnly.value = false
    loadedForOrg = false
  }

  return {
    headerMenu,
    navItems,
    branding,
    loading,
    loadError,
    saving,
    saveError,
    readOnly,
    canvasNav,
    canvasBranding,
    load,
    ensureHeaderMenu,
    addNavItem,
    updateNavItem,
    removeNavItem,
    moveNavItem,
    saveBranding,
    reset,
  }
})
