<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { Company } from '@/features/crm/companies/api/companies.api'
import { useUpdateCompanyMutation } from '@/features/crm/companies/api/companies.queries'
import { platformOrganizationsApi } from '@/features/platform/api/organizations.api'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'

const props = defineProps<{ company: Pick<Company, 'id' | 'tenant_organization'> }>()
const emit = defineEmits<{ changed: [] }>()

const auth = useAuthStore()
const tenant = useTenantStore()
const updateMutation = useUpdateCompanyMutation()

// Hanya org platform dengan izin company.link_workspace yang boleh mengubah tautan; API menolak selain itu.
const visible = computed(() => tenant.isPlatformOrganization && auth.can('company.link_workspace'))

const linked = computed(() => props.company.tenant_organization ?? null)
const searching = ref(false)
const confirmingUnlink = ref(false)
const term = ref('')
const debouncedTerm = ref('')
const errorMessage = ref('')

let timer: ReturnType<typeof setTimeout> | undefined
watch(term, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedTerm.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

const candidatesQuery = useQuery({
  queryKey: computed(
    () => ['platform', 'organizations', 'link-search', debouncedTerm.value] as const,
  ),
  queryFn: () =>
    platformOrganizationsApi.list({
      search: debouncedTerm.value || undefined,
      type: 'customer',
      per_page: 10,
    }),
  enabled: searching,
})
const candidates = computed(() => candidatesQuery.data.value?.data ?? [])

function openSearch() {
  errorMessage.value = ''
  term.value = ''
  debouncedTerm.value = ''
  searching.value = true
}

function extractError(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })
    ?.response
  if (response?.status === 409) return 'Workspace ini sudah terhubung ke company lain'
  return response?.data?.message || 'Gagal mengubah tautan workspace, silakan coba lagi.'
}

async function setLink(tenantOrganizationId: string | null) {
  errorMessage.value = ''
  try {
    await updateMutation.mutateAsync({
      id: props.company.id,
      payload: { tenant_organization_id: tenantOrganizationId },
    })
    searching.value = false
    confirmingUnlink.value = false
    emit('changed')
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}
</script>

<template>
  <div v-if="visible" class="space-y-2 rounded-lg border p-3" data-testid="workspace-link">
    <div class="text-sm font-medium">Workspace terhubung</div>

    <div v-if="linked" class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="truncate text-sm font-medium">{{ linked.name }}</div>
        <div class="truncate text-xs text-gray-500">{{ linked.slug }}</div>
      </div>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-medium"
        :class="
          linked.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        "
        data-testid="workspace-status"
      >
        {{ linked.status }}
      </span>
    </div>
    <p v-else class="text-sm text-gray-500">Belum terhubung ke workspace.</p>

    <div v-if="!searching && !confirmingUnlink" class="flex gap-2">
      <BaseButton variant="outline" @click="openSearch">
        {{ linked ? 'Ganti' : 'Hubungkan' }}
      </BaseButton>
      <BaseButton v-if="linked" variant="secondary" @click="confirmingUnlink = true">
        Lepaskan
      </BaseButton>
    </div>

    <div v-if="searching" class="space-y-2">
      <input
        v-model="term"
        type="search"
        placeholder="Cari workspace pelanggan..."
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        data-testid="workspace-search"
      />
      <p v-if="candidatesQuery.isPending.value" class="text-xs text-gray-500">Memuat...</p>
      <p v-else-if="candidates.length === 0" class="text-xs text-gray-500">
        Tidak ada workspace pelanggan yang cocok.
      </p>
      <ul v-else class="max-h-48 divide-y overflow-y-auto rounded-lg border">
        <li v-for="org in candidates" :key="org.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
            :disabled="updateMutation.isPending.value"
            @click="setLink(org.id)"
          >
            <span class="truncate font-medium">{{ org.name }}</span>
            <span class="truncate text-xs text-gray-500">{{ org.slug }}</span>
          </button>
        </li>
      </ul>
      <BaseButton variant="secondary" @click="searching = false">Batal</BaseButton>
    </div>

    <div v-if="confirmingUnlink" class="space-y-2" role="alert">
      <p class="text-sm">Fitur dari langganan company ini akan dicabut dari workspace.</p>
      <div class="flex gap-2">
        <BaseButton
          variant="danger"
          :disabled="updateMutation.isPending.value"
          @click="setLink(null)"
        >
          Lepaskan
        </BaseButton>
        <BaseButton variant="secondary" @click="confirmingUnlink = false">Batal</BaseButton>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
  </div>
</template>
