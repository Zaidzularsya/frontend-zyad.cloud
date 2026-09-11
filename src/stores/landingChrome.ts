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
 * Tenant-wide landing "chrome": the header + footer navigation menus
 * (`landing_menus` location=header/footer + items) and the default brand row
 * (`landing_brandings`). These are shared across every page of the tenant, so
 * they live outside the per-page section autosave buffer (`landingBuilder`).
 * Writes persist immediately to their own admin endpoints.
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

function toCanvasNav(items: LandingMenuItem[]): CanvasNavItem[] {
  return items
    .filter((item) => item.is_enabled && !item.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: hrefForItem(item),
      target: item.target === 'new_tab' ? '_blank' : '_self',
    }))
}

export const useLandingChromeStore = defineStore('landingChrome', () => {
  const branding = ref<LandingBranding | null>(null)

  /**
   * Unsaved brand edits from the builder panel, overlaid on `branding` so the
   * canvas previews the brand name / logo live before "Simpan brand" persists
   * them. Cleared on a successful save (and on reset).
   */
  const brandDraft = ref<{
    company_name?: string
    logo_light_url?: string
    logo_dark_url?: string
  }>({})

  const loading = ref(false)
  const loadError = ref('')
  const saving = ref(false)
  const saveError = ref('')
  const readOnly = ref(false)
  let loadedForOrg = false

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

  /**
   * One `location` (header/footer) menu + its items, with the CRUD actions the
   * builder panels drive. Header and footer are otherwise-identical single
   * tenant-wide menus — this factory is instantiated once per location below
   * instead of duplicating the same create/reorder/add/update/remove logic
   * twice.
   */
  function useMenuGroup(location: 'header' | 'footer', defaultName: string) {
    const menu = ref<LandingMenu | null>(null)
    const items = ref<LandingMenuItem[]>([])

    async function ensureMenu(): Promise<string | null> {
      if (menu.value) return menu.value.id
      saving.value = true
      saveError.value = ''
      try {
        const res = await landingApi.createMenu({ name: defaultName, location, is_active: true })
        menu.value = res.data
        items.value = []
        return res.data.id
      } catch (error) {
        saveError.value = apiMessage(error, `Gagal membuat menu ${location}.`)
        if (apiMessage(error, '').startsWith('Anda tidak punya izin')) readOnly.value = true
        return null
      } finally {
        saving.value = false
      }
    }

    async function reloadItems() {
      if (!menu.value) return
      items.value = (await landingApi.getMenuItems(menu.value.id)).data
    }

    async function addItem(payload: MenuItemPayload) {
      const menuId = await ensureMenu()
      if (!menuId) return
      await run(async () => {
        await landingApi.createMenuItem(menuId, {
          ...payload,
          sort_order: items.value.length * 10 + 10,
        })
        await reloadItems()
      }, `Gagal menambah item menu ${location}.`)
    }

    async function updateItem(id: string, payload: MenuItemPayload) {
      if (!menu.value) return
      await run(async () => {
        await landingApi.updateMenuItem(menu.value!.id, id, payload)
        await reloadItems()
      }, `Gagal menyimpan item menu ${location}.`)
    }

    async function removeItem(id: string) {
      if (!menu.value) return
      await run(async () => {
        await landingApi.deleteMenuItem(menu.value!.id, id)
        await reloadItems()
      }, `Gagal menghapus item menu ${location}.`)
    }

    async function moveItem(id: string, direction: -1 | 1) {
      if (!menu.value) return
      const ordered = [...items.value].sort((a, b) => a.sort_order - b.sort_order)
      const index = ordered.findIndex((i) => i.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= ordered.length) return
      const [moved] = ordered.splice(index, 1)
      if (!moved) return
      ordered.splice(target, 0, moved)
      await run(async () => {
        await landingApi.reorderMenuItems(menu.value!.id, { item_ids: ordered.map((i) => i.id) })
        await reloadItems()
      }, `Gagal mengubah urutan menu ${location}.`)
    }

    return { menu, items, ensureMenu, reloadItems, addItem, updateItem, removeItem, moveItem }
  }

  const header = useMenuGroup('header', 'Header Menu')
  const footer = useMenuGroup('footer', 'Footer Menu')

  const canvasNav = computed<CanvasNavItem[]>(() => toCanvasNav(header.items.value))
  const canvasFooterNav = computed<CanvasNavItem[]>(() => toCanvasNav(footer.items.value))

  const canvasBranding = computed(() => {
    const b = branding.value
    const d = brandDraft.value
    const colors = (b?.colors ?? {}) as Record<string, string>
    return {
      companyName: d.company_name ?? b?.company_name ?? '',
      logoUrl: d.logo_light_url ?? b?.logo_light_url ?? '',
      logoDarkUrl: d.logo_dark_url ?? b?.logo_dark_url ?? '',
      primary: colors.primary || '#2563EB',
    }
  })

  function setBrandDraft(patch: {
    company_name?: string
    logo_light_url?: string
    logo_dark_url?: string
  }) {
    brandDraft.value = { ...brandDraft.value, ...patch }
  }

  function clearBrandDraft() {
    brandDraft.value = {}
  }

  async function load(force = false) {
    if (loadedForOrg && !force) return
    loading.value = true
    loadError.value = ''
    try {
      const [menusRes, brandingRes] = await Promise.all([
        landingApi.getMenus(),
        landingApi.getDefaultBranding(),
      ])
      const findMenu = (location: string) =>
        menusRes.data.find((m) => m.location === location && m.is_active) ??
        menusRes.data.find((m) => m.location === location) ??
        null
      header.menu.value = findMenu('header')
      footer.menu.value = findMenu('footer')
      branding.value = brandingRes.data
      const [headerItems, footerItems] = await Promise.all([
        header.menu.value ? landingApi.getMenuItems(header.menu.value.id) : null,
        footer.menu.value ? landingApi.getMenuItems(footer.menu.value.id) : null,
      ])
      header.items.value = headerItems?.data ?? []
      footer.items.value = footerItems?.data ?? []
      loadedForOrg = true
    } catch (error) {
      loadError.value = apiMessage(error, 'Gagal memuat navigasi & brand.')
    } finally {
      loading.value = false
    }
  }

  async function saveBranding(patch: Partial<LandingBranding>) {
    await run(async () => {
      const res = await landingApi.updateDefaultBranding(patch)
      branding.value = res.data
      clearBrandDraft()
    }, 'Gagal menyimpan brand.')
  }

  function reset() {
    header.menu.value = null
    header.items.value = []
    footer.menu.value = null
    footer.items.value = []
    branding.value = null
    brandDraft.value = {}
    loadError.value = ''
    saveError.value = ''
    readOnly.value = false
    loadedForOrg = false
  }

  return {
    headerMenu: header.menu,
    navItems: header.items,
    footerMenu: footer.menu,
    footerItems: footer.items,
    branding,
    loading,
    loadError,
    saving,
    saveError,
    readOnly,
    canvasNav,
    canvasFooterNav,
    canvasBranding,
    brandDraft,
    setBrandDraft,
    clearBrandDraft,
    load,
    ensureHeaderMenu: header.ensureMenu,
    addNavItem: header.addItem,
    updateNavItem: header.updateItem,
    removeNavItem: header.removeItem,
    moveNavItem: header.moveItem,
    ensureFooterMenu: footer.ensureMenu,
    addFooterNavItem: footer.addItem,
    updateFooterNavItem: footer.updateItem,
    removeFooterNavItem: footer.removeItem,
    moveFooterNavItem: footer.moveItem,
    saveBranding,
    reset,
  }
})
