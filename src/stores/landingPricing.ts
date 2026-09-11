import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { landingApi } from '@/features/landing/shared/api/landing.api'
import type { LandingPricingPlan } from '@/features/landing/shared/types/landing.types'

/**
 * Tenant-wide pricing-plan cards (`landing_pricing_plans`) shown by the
 * `zyad-pricing-plans` GrapesJS block. Marketing content the tenant writes
 * themselves — not an integration with the platform's own subscription
 * plans. Writes persist immediately to their own admin endpoints, same
 * pattern as `landingChrome.ts`.
 */

export interface PricingPlanPayload {
  name: string
  price_label: string
  interval_label?: string
  description?: string
  features: string[]
  cta_label: string
  cta_url?: string
  is_featured: boolean
  is_enabled: boolean
}

function apiMessage(error: unknown, fallback: string): string {
  const res = (error as { response?: { data?: { message?: string }; status?: number } })?.response
  if (res?.status === 403) return 'Anda tidak punya izin mengedit paket harga tenant ini.'
  return res?.data?.message ?? fallback
}

export const useLandingPricingStore = defineStore('landingPricing', () => {
  const plans = ref<LandingPricingPlan[]>([])
  const loading = ref(false)
  const loadError = ref('')
  const saving = ref(false)
  const saveError = ref('')
  const readOnly = ref(false)
  let loadedForOrg = false

  const orderedPlans = computed(() => [...plans.value].sort((a, b) => a.sort_order - b.sort_order))
  const canvasPlans = computed(() => orderedPlans.value.filter((p) => p.is_enabled))

  async function load(force = false) {
    if (loadedForOrg && !force) return
    loading.value = true
    loadError.value = ''
    try {
      plans.value = (await landingApi.getPricingPlans()).data
      loadedForOrg = true
    } catch (error) {
      loadError.value = apiMessage(error, 'Gagal memuat paket harga.')
    } finally {
      loading.value = false
    }
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

  async function reload() {
    plans.value = (await landingApi.getPricingPlans()).data
  }

  async function add(payload: PricingPlanPayload) {
    await run(async () => {
      await landingApi.createPricingPlan(payload)
      await reload()
    }, 'Gagal menambah paket harga.')
  }

  async function update(id: string, payload: PricingPlanPayload) {
    await run(async () => {
      await landingApi.updatePricingPlan(id, payload)
      await reload()
    }, 'Gagal menyimpan paket harga.')
  }

  async function remove(id: string) {
    await run(async () => {
      await landingApi.deletePricingPlan(id)
      await reload()
    }, 'Gagal menghapus paket harga.')
  }

  async function move(id: string, direction: -1 | 1) {
    const ordered = orderedPlans.value
    const index = ordered.findIndex((p) => p.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    const reordered = [...ordered]
    const [moved] = reordered.splice(index, 1)
    if (!moved) return
    reordered.splice(target, 0, moved)
    await run(async () => {
      await landingApi.reorderPricingPlans({ plan_ids: reordered.map((p) => p.id) })
      await reload()
    }, 'Gagal mengubah urutan paket harga.')
  }

  function reset() {
    plans.value = []
    loadError.value = ''
    saveError.value = ''
    readOnly.value = false
    loadedForOrg = false
  }

  return {
    plans,
    loading,
    loadError,
    saving,
    saveError,
    readOnly,
    orderedPlans,
    canvasPlans,
    load,
    add,
    update,
    remove,
    move,
    reset,
  }
})
