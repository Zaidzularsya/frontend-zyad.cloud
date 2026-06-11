import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { tenantStorage } from '@/lib/tenant'
import { queryClient } from '@/lib/query-client'
import type { Tenant } from '@/types/tenant'

export const useTenantStore = defineStore('tenant', () => {
  const tenants = ref<Tenant[]>([])
  const activeTenantId = ref<string | null>(tenantStorage.get())

  const activeTenant = computed(
    () => tenants.value.find((tenant) => tenant.id === activeTenantId.value) ?? null,
  )
  const hasTenant = computed(() => Boolean(activeTenant.value))

  function hydrate(items: Tenant[], preferredTenantId?: string) {
    tenants.value = items
    const storedIsValid = items.some((tenant) => tenant.id === activeTenantId.value)
    const nextId = storedIsValid ? activeTenantId.value : preferredTenantId || items[0]?.id || null

    if (nextId) select(nextId, false)
    else activeTenantId.value = null
  }

  function select(tenantId: string, invalidate = true) {
    if (!tenants.value.some((tenant) => tenant.id === tenantId)) return
    activeTenantId.value = tenantId
    tenantStorage.set(tenantId)
    if (invalidate) queryClient.clear()
  }

  function clear() {
    tenants.value = []
    activeTenantId.value = null
    tenantStorage.clear()
  }

  return { tenants, activeTenantId, activeTenant, hasTenant, hydrate, select, clear }
})
