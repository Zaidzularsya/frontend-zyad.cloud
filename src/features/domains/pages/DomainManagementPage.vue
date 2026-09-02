<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  CheckCircle2,
  Clipboard,
  Globe2,
  Layout,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  organizationDomainService,
  type OrganizationDomain,
  type OrganizationDomainChallenge,
  type OrganizationDomainSslStatus,
  type OrganizationDomainType,
} from '@/features/domains/api/domain.api'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type {
  LandingAvailableDomain,
  LandingDomainBinding,
  LandingPage,
} from '@/features/landing/shared/types/landing.types'

const props = defineProps<{
  mode: 'workspace' | 'platform'
  title: string
  description: string
}>()

const isPlatform = computed(() => props.mode === 'platform')

const workspaceDomains = ref<OrganizationDomain[]>([])
const platformDomains = ref<OrganizationDomain[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const sortKey = ref<'host' | 'status' | 'updated'>('updated')
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const addDrawerOpen = ref(false)
const dnsDrawerOpen = ref(false)
const selectedDomain = ref<OrganizationDomain | null>(null)
const latestChallenge = ref<OrganizationDomainChallenge | null>(null)
const confirmAction = ref<{
  title: string
  message: string
  confirmLabel: string
  variant: 'primary' | 'danger'
  run: () => Promise<void>
} | null>(null)

const addDomainForm = reactive({
  canonical_host: '',
  subdomainLabel: '',
  type: 'custom' as OrganizationDomainType,
  error: '',
})

// Dashboard dilayani dari path (/app) pada domain platform yang sama
// (mis. zyad.cloud/app), sehingga hostname saat ini adalah domain primer
// tempat subdomain tenant baru didaftarkan.
const platformApexDomain = computed(() => window.location.hostname)

// Landing page binding: which landing page (if any) a verified domain
// serves. Only meaningful in workspace mode — a domain must first be
// verified at the organization level (above) before it can be bound.
const availableDomains = ref<LandingAvailableDomain[]>([])
const domainBindings = ref<LandingDomainBinding[]>([])
const landingPages = ref<LandingPage[]>([])
const bindingBusyId = ref('')
const pendingBindPageId = reactive<Record<string, string>>({})

const availableDomainIds = computed(() => new Set(availableDomains.value.map((item) => item.id)))
const bindingByDomainId = computed(() => {
  const map = new Map<string, LandingDomainBinding>()
  for (const binding of domainBindings.value) {
    map.set(binding.organization_domain_id, binding)
  }
  return map
})
const pageById = computed(() => {
  const map = new Map<string, LandingPage>()
  for (const page of landingPages.value) {
    map.set(page.id, page)
  }
  return map
})

function extractError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? 'Request gagal diproses.'
  }
  return error instanceof Error ? error.message : 'Request gagal diproses.'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizeHost(value: string) {
  return value.trim().toLowerCase()
}

function validateHost(value: string) {
  const host = normalizeHost(value)
  if (!host) return 'Domain wajib diisi.'
  if (/^https?:\/\//i.test(host)) return 'Masukkan hostname saja tanpa http atau https.'
  if (host.includes('/') || host.includes(' ')) return 'Domain tidak boleh berisi path atau spasi.'
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes('.')) return 'Format domain tidak valid.'
  return ''
}

function validateSubdomainLabel(value: string) {
  const label = normalizeHost(value)
  if (!label) return 'Nama subdomain wajib diisi.'
  if (label.includes('.')) return `Cukup isi satu nama, tanpa ".${platformApexDomain.value}".`
  if (!/^[a-z0-9-]+$/.test(label) || label.startsWith('-') || label.endsWith('-'))
    return 'Hanya huruf, angka, dan tanda hubung (-), tidak boleh diawali/diakhiri strip.'
  return ''
}

function statusBadgeClass(status?: string) {
  const normalized = status ?? 'pending'
  if (normalized === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (normalized === 'verified') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (normalized === 'failed') return 'bg-red-50 text-red-700 ring-red-200'
  if (normalized === 'disabled' || normalized === 'archived')
    return 'bg-gray-100 text-gray-600 ring-gray-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

function sslBadgeClass(status?: OrganizationDomainSslStatus | string) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'failed' || status === 'expired') return 'bg-red-50 text-red-700 ring-red-200'
  if (status === 'not_required') return 'bg-gray-100 text-gray-600 ring-gray-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

const filteredWorkspaceDomains = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return workspaceDomains.value
    .filter((domain) => {
      const matchesQuery = !query || domain.canonical_host.toLowerCase().includes(query)
      const matchesStatus = !statusFilter.value || domain.status === statusFilter.value
      const matchesType = !typeFilter.value || domain.type === typeFilter.value
      return matchesQuery && matchesStatus && matchesType
    })
    .sort((a, b) => {
      if (sortKey.value === 'host') return a.canonical_host.localeCompare(b.canonical_host)
      if (sortKey.value === 'status') return a.status.localeCompare(b.status)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
})

const workspaceSummary = computed(() => {
  const active = workspaceDomains.value.filter((item) => item.status === 'active')
  const pending = workspaceDomains.value.filter(
    (item) => item.status === 'pending' || item.status === 'pending_verification',
  )
  const sslActive = workspaceDomains.value.filter((item) => item.ssl_status === 'active')
  const primary = workspaceDomains.value.find((item) => item.is_primary)
  return [
    { label: 'Total domains', value: String(workspaceDomains.value.length), icon: Globe2 },
    { label: 'Active domains', value: String(active.length), icon: CheckCircle2 },
    { label: 'Pending verification', value: String(pending.length), icon: RefreshCw },
    { label: 'SSL active', value: String(sslActive.length), icon: ShieldCheck },
    { label: 'Primary domain', value: primary?.canonical_host ?? '-', icon: Star },
  ]
})

const platformSummary = computed(() => {
  const active = platformDomains.value.filter((item) => item.status === 'active')
  const pending = platformDomains.value.filter(
    (item) => item.status === 'pending' || item.status === 'pending_verification',
  )
  const primary = platformDomains.value.filter((item) => item.is_primary)
  return [
    { label: 'Total domains', value: String(platformDomains.value.length), icon: Globe2 },
    { label: 'Active domains', value: String(active.length), icon: CheckCircle2 },
    { label: 'Pending verification', value: String(pending.length), icon: RefreshCw },
    { label: 'Primary domains', value: String(primary.length), icon: Star },
  ]
})

const filteredPlatformDomains = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return platformDomains.value
    .filter((domain) => {
      const matchesQuery =
        !query ||
        domain.canonical_host.toLowerCase().includes(query) ||
        domain.organization_id.toLowerCase().includes(query)
      const matchesStatus = !statusFilter.value || domain.status === statusFilter.value
      const matchesType = !typeFilter.value || domain.type === typeFilter.value
      return matchesQuery && matchesStatus && matchesType
    })
    .sort((a, b) => {
      if (sortKey.value === 'host') return a.canonical_host.localeCompare(b.canonical_host)
      if (sortKey.value === 'status') return a.status.localeCompare(b.status)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
})

async function loadWorkspaceDomains() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    workspaceDomains.value = await organizationDomainService.list({
      per_page: 100,
    })
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    isLoading.value = false
  }
}

async function loadPlatformDomains() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    platformDomains.value = await organizationDomainService.list({
      per_page: 100,
    })
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    isLoading.value = false
  }
}

async function loadLandingBindingData() {
  try {
    const [available, bindings, pages] = await Promise.all([
      landingApi.getAvailableDomains(),
      landingApi.getAllDomainBindings(),
      landingApi.getPages({ per_page: 100, is_template: false }),
    ])
    availableDomains.value = available.data
    domainBindings.value = bindings.data
    landingPages.value = pages.data
  } catch {
    // Non-fatal: the org-level domain table still works without binding data.
  }
}

async function refreshData() {
  if (isPlatform.value) {
    await loadPlatformDomains()
  } else {
    await Promise.all([loadWorkspaceDomains(), loadLandingBindingData()])
  }
}

async function bindDomainToPage(domain: OrganizationDomain) {
  const pageId = pendingBindPageId[domain.id]
  if (!pageId) return

  bindingBusyId.value = domain.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await landingApi.createDomainBinding({
      organization_domain_id: domain.id,
      landing_page_id: pageId,
      is_primary: false,
    })
    await loadLandingBindingData()
    successMessage.value = `${domain.canonical_host} berhasil di-bind ke landing page.`
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    bindingBusyId.value = ''
  }
}

async function setPrimaryDomainBinding(binding: LandingDomainBinding) {
  bindingBusyId.value = binding.organization_domain_id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await landingApi.updateDomainBinding(binding.id, {
      organization_domain_id: binding.organization_domain_id,
      landing_page_id: binding.landing_page_id,
      is_primary: true,
    })
    await loadLandingBindingData()
    successMessage.value = 'Primary landing page binding berhasil diperbarui.'
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    bindingBusyId.value = ''
  }
}

async function unbindDomain(binding: LandingDomainBinding) {
  bindingBusyId.value = binding.organization_domain_id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await landingApi.deleteDomainBinding(binding.id)
    await loadLandingBindingData()
    successMessage.value = 'Domain berhasil di-unbind dari landing page.'
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    bindingBusyId.value = ''
  }
}

function openAddDrawer() {
  addDomainForm.canonical_host = ''
  addDomainForm.subdomainLabel = ''
  addDomainForm.type = 'custom'
  addDomainForm.error = ''
  addDrawerOpen.value = true
}

async function submitDomain() {
  const isSubdomain = addDomainForm.type === 'subdomain'
  addDomainForm.error = isSubdomain
    ? validateSubdomainLabel(addDomainForm.subdomainLabel)
    : validateHost(addDomainForm.canonical_host)
  if (addDomainForm.error) return

  const canonicalHost = isSubdomain
    ? `${normalizeHost(addDomainForm.subdomainLabel)}.${platformApexDomain.value}`
    : normalizeHost(addDomainForm.canonical_host)

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const challenge = await organizationDomainService.create({
      canonical_host: canonicalHost,
      type: addDomainForm.type,
      is_primary: false,
    })
    addDrawerOpen.value = false
    if (challenge.challenge_type === 'auto_verified') {
      await refreshData()
      successMessage.value = 'Subdomain berhasil dibuat dan langsung aktif.'
    } else {
      latestChallenge.value = challenge
      selectedDomain.value = challenge.domain
      dnsDrawerOpen.value = true
      await refreshData()
      successMessage.value = 'Domain berhasil dibuat. Lanjutkan verifikasi DNS.'
    }
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    isSaving.value = false
  }
}

function openDnsDrawer(domain: OrganizationDomain) {
  selectedDomain.value = domain
  dnsDrawerOpen.value = true
}

async function regenerateChallenge(domain: OrganizationDomain) {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const challenge = await organizationDomainService.regenerateChallenge(domain.id)
    latestChallenge.value = challenge
    selectedDomain.value = challenge.domain
    await refreshData()
    successMessage.value = 'Token verifikasi baru berhasil dibuat. Perbarui TXT record Anda.'
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    isSaving.value = false
  }
}

async function verifyDomain(domain: OrganizationDomain) {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await organizationDomainService.verify(domain.id)
    await refreshData()
    successMessage.value = 'DNS verification berhasil diproses.'
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    isSaving.value = false
  }
}

function confirmSetPrimary(domain: OrganizationDomain) {
  confirmAction.value = {
    title: 'Set primary domain',
    message: `Jadikan ${domain.canonical_host} sebagai primary domain workspace?`,
    confirmLabel: 'Set Primary',
    variant: 'primary',
    run: async () => {
      await organizationDomainService.setPrimary(domain.id)
      await refreshData()
      successMessage.value = 'Primary domain berhasil diperbarui.'
    },
  }
}

function confirmDeleteDomain(domain: OrganizationDomain) {
  confirmAction.value = {
    title: 'Disable domain',
    message: `Domain ${domain.canonical_host} akan dinonaktifkan dari workspace.`,
    confirmLabel: 'Disable Domain',
    variant: 'danger',
    run: async () => {
      await organizationDomainService.delete(domain.id)
      await refreshData()
      successMessage.value = 'Domain berhasil dinonaktifkan.'
    },
  }
}

async function runConfirmedAction() {
  if (!confirmAction.value) return
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await confirmAction.value.run()
    confirmAction.value = null
  } catch (error) {
    errorMessage.value = extractError(error)
  } finally {
    isSaving.value = false
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
  successMessage.value = 'Disalin ke clipboard.'
}

onMounted(refreshData)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="title" :description="description">
      <BaseButton variant="outline" :disabled="isLoading" @click="refreshData">
        <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </BaseButton>
      <BaseButton @click="openAddDrawer">+ Add Domain</BaseButton>
    </PageHeader>

    <div
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>
    <div
      v-if="successMessage"
      class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      {{ successMessage }}
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <BaseCard
        v-for="item in isPlatform ? platformSummary : workspaceSummary"
        :key="item.label"
        class="space-y-3"
      >
        <component :is="item.icon" class="h-5 w-5 text-brand-500" />
        <div>
          <p class="text-xs font-medium uppercase text-gray-500">{{ item.label }}</p>
          <p class="mt-1 truncate text-xl font-semibold text-gray-900 dark:text-white">
            {{ item.value }}
          </p>
        </div>
      </BaseCard>
    </div>

    <BaseCard class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <label class="relative min-w-[240px] flex-1">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchQuery"
            class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            placeholder="Search domain"
          />
        </label>

        <select
          v-model="statusFilter"
          class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="active">Active</option>
          <option value="failed">Failed</option>
          <option value="disabled">Disabled</option>
        </select>
        <select
          v-model="typeFilter"
          class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">All type</option>
          <option value="custom">Custom</option>
          <option value="subdomain">Subdomain</option>
        </select>
        <select
          v-model="sortKey"
          class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="updated">Updated</option>
          <option value="host">Domain</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead class="text-left text-xs uppercase text-gray-500">
            <tr v-if="!isPlatform">
              <th class="px-3 py-3">Domain</th>
              <th class="px-3 py-3">Type</th>
              <th class="px-3 py-3">Status</th>
              <th class="px-3 py-3">Primary</th>
              <th class="px-3 py-3">SSL</th>
              <th class="px-3 py-3">Verification</th>
              <th class="px-3 py-3">Landing page</th>
              <th class="px-3 py-3">Updated</th>
              <th class="px-3 py-3 text-right">Actions</th>
            </tr>
            <tr v-else>
              <th class="px-3 py-3">Domain</th>
              <th class="px-3 py-3">Type</th>
              <th class="px-3 py-3">Status</th>
              <th class="px-3 py-3">Primary</th>
              <th class="px-3 py-3">SSL</th>
              <th class="px-3 py-3">Verification</th>
              <th class="px-3 py-3">Updated</th>
              <th class="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="isLoading">
              <td colspan="8" class="px-3 py-8 text-center text-gray-500">Loading domains...</td>
            </tr>
            <template v-else-if="!isPlatform">
              <tr v-for="domain in filteredWorkspaceDomains" :key="domain.id">
                <td class="px-3 py-4 font-medium text-gray-900 dark:text-white">
                  {{ domain.canonical_host }}
                </td>
                <td class="px-3 py-4 capitalize">{{ domain.type }}</td>
                <td class="px-3 py-4">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                    :class="statusBadgeClass(domain.status)"
                  >
                    {{ domain.status }}
                  </span>
                </td>
                <td class="px-3 py-4">
                  <span
                    v-if="domain.is_primary"
                    class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200"
                  >
                    Primary
                  </span>
                  <span v-else>-</span>
                </td>
                <td class="px-3 py-4">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                    :class="sslBadgeClass(domain.ssl_status)"
                  >
                    {{ domain.ssl_status }}
                  </span>
                </td>
                <td class="px-3 py-4">
                  <div class="max-w-[220px]">
                    <p>
                      {{ domain.verified_at ? formatDate(domain.verified_at) : 'Not verified' }}
                    </p>
                    <p v-if="domain.verification_error" class="truncate text-xs text-red-600">
                      {{ domain.verification_error }}
                    </p>
                  </div>
                </td>
                <td class="px-3 py-4">
                  <div v-if="!availableDomainIds.has(domain.id)" class="text-xs text-gray-400">
                    Verify domain first
                  </div>
                  <div v-else-if="bindingByDomainId.get(domain.id)" class="max-w-[200px] space-y-1">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {{
                        pageById.get(bindingByDomainId.get(domain.id)!.landing_page_id)?.title ??
                        pageById.get(bindingByDomainId.get(domain.id)!.landing_page_id)?.name ??
                        'Unknown page'
                      }}
                      <span
                        v-if="bindingByDomainId.get(domain.id)!.is_primary"
                        class="ml-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-200"
                      >
                        Primary
                      </span>
                    </p>
                    <div class="flex gap-1.5">
                      <button
                        v-if="!bindingByDomainId.get(domain.id)!.is_primary"
                        type="button"
                        class="rounded border px-2 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        :disabled="bindingBusyId === domain.id"
                        @click="setPrimaryDomainBinding(bindingByDomainId.get(domain.id)!)"
                      >
                        Set primary
                      </button>
                      <button
                        type="button"
                        class="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        :disabled="bindingBusyId === domain.id"
                        @click="unbindDomain(bindingByDomainId.get(domain.id)!)"
                      >
                        Unbind
                      </button>
                    </div>
                  </div>
                  <div v-else class="flex max-w-[220px] items-center gap-1.5">
                    <select
                      v-model="pendingBindPageId[domain.id]"
                      class="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900"
                    >
                      <option value="">Pilih page...</option>
                      <option v-for="page in landingPages" :key="page.id" :value="page.id">
                        {{ page.title || page.name }}
                      </option>
                    </select>
                    <button
                      type="button"
                      class="shrink-0 rounded-lg border p-1.5 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      title="Bind to page"
                      :disabled="!pendingBindPageId[domain.id] || bindingBusyId === domain.id"
                      @click="bindDomainToPage(domain)"
                    >
                      <Layout class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td class="px-3 py-4">{{ formatDate(domain.updated_at) }}</td>
                <td class="px-3 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      class="rounded-lg border p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      title="DNS instruction"
                      @click="openDnsDrawer(domain)"
                    >
                      <Clipboard class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg border p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      title="Verify DNS"
                      @click="verifyDomain(domain)"
                    >
                      <RefreshCw class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg border p-2 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      :disabled="domain.is_primary"
                      title="Set primary"
                      @click="confirmSetPrimary(domain)"
                    >
                      <Star class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      :disabled="domain.is_primary"
                      title="Disable domain"
                      @click="confirmDeleteDomain(domain)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredWorkspaceDomains.length === 0">
                <td colspan="9" class="px-3 py-8 text-center text-gray-500">Belum ada domain.</td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="domain in filteredPlatformDomains" :key="domain.id">
                <td class="px-3 py-4 font-medium text-gray-900 dark:text-white">
                  {{ domain.canonical_host }}
                </td>
                <td class="px-3 py-4 capitalize">{{ domain.type }}</td>
                <td class="px-3 py-4">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                    :class="statusBadgeClass(domain.status)"
                  >
                    {{ domain.status }}
                  </span>
                </td>
                <td class="px-3 py-4">
                  <span
                    v-if="domain.is_primary"
                    class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200"
                  >
                    Primary
                  </span>
                  <span v-else>-</span>
                </td>
                <td class="px-3 py-4">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                    :class="sslBadgeClass(domain.ssl_status)"
                  >
                    {{ domain.ssl_status }}
                  </span>
                </td>
                <td class="px-3 py-4">
                  <div class="max-w-[220px]">
                    <p>
                      {{ domain.verified_at ? formatDate(domain.verified_at) : 'Not verified' }}
                    </p>
                    <p v-if="domain.verification_error" class="truncate text-xs text-red-600">
                      {{ domain.verification_error }}
                    </p>
                  </div>
                </td>
                <td class="px-3 py-4">{{ formatDate(domain.updated_at) }}</td>
                <td class="px-3 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      class="rounded-lg border p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      title="DNS instruction"
                      @click="openDnsDrawer(domain)"
                    >
                      <Clipboard class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg border p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      title="Verify DNS"
                      @click="verifyDomain(domain)"
                    >
                      <RefreshCw class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg border p-2 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      :disabled="domain.is_primary"
                      title="Set primary"
                      @click="confirmSetPrimary(domain)"
                    >
                      <Star class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      :disabled="domain.is_primary"
                      title="Disable domain"
                      @click="confirmDeleteDomain(domain)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredPlatformDomains.length === 0">
                <td colspan="8" class="px-3 py-8 text-center text-gray-500">Belum ada domain.</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <div
      v-if="addDrawerOpen"
      class="fixed inset-0 z-40 bg-black/30"
      @click.self="addDrawerOpen = false"
    >
      <aside class="ml-auto h-full w-full max-w-md bg-white p-6 shadow-xl dark:bg-gray-950">
        <div class="mb-6 flex items-start justify-between">
          <div>
            <h2 class="text-lg font-semibold">Add Domain</h2>
            <p class="mt-1 text-sm text-gray-500">
              Pilih tipe domain, lalu isi sesuai format yang diminta.
            </p>
          </div>
          <button class="rounded-lg border p-2 dark:border-gray-700" @click="addDrawerOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitDomain">
          <label class="block text-sm font-medium">
            Type
            <select
              v-model="addDomainForm.type"
              class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              @change="addDomainForm.error = ''"
            >
              <option value="custom">Custom domain (punya sendiri)</option>
              <option value="subdomain">
                Subdomain {{ platformApexDomain }} (gratis, langsung aktif)
              </option>
            </select>
          </label>

          <template v-if="addDomainForm.type === 'subdomain'">
            <label class="block text-sm font-medium">
              Nama subdomain
              <div
                class="mt-2 flex items-stretch overflow-hidden rounded-lg border border-gray-200 focus-within:border-brand-500 dark:border-gray-700"
              >
                <input
                  v-model="addDomainForm.subdomainLabel"
                  class="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none dark:bg-gray-900"
                  placeholder="toko-anda"
                />
                <span
                  class="flex items-center whitespace-nowrap bg-gray-50 px-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                >
                  .{{ platformApexDomain }}
                </span>
              </div>
            </label>
            <p class="text-xs text-gray-500">
              Isi hanya nama subdomain-nya saja (huruf, angka, tanda hubung), misalnya
              <code class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">toko-anda</code>
              akan menjadi
              <code class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800"
                >toko-anda.{{ platformApexDomain }}</code
              >. Subdomain langsung aktif tanpa perlu setting DNS.
            </p>
          </template>

          <template v-else>
            <label class="block text-sm font-medium">
              Domain
              <input
                v-model="addDomainForm.canonical_host"
                class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
                placeholder="tokoanda.com"
              />
            </label>
            <p class="text-xs text-gray-500">
              Masukkan domain milik Anda sendiri tanpa
              <code class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">http://</code> dan
              tanpa path, misalnya
              <code class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">tokoanda.com</code>
              atau
              <code class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">www.tokoanda.com</code
              >. Anda perlu mengarahkan DNS domain ini setelah dibuat.
            </p>
          </template>

          <p v-if="addDomainForm.error" class="text-sm text-red-600">{{ addDomainForm.error }}</p>
          <BaseButton type="submit" class="w-full" :disabled="isSaving">
            <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
            Create Domain
          </BaseButton>
        </form>
      </aside>
    </div>

    <div
      v-if="dnsDrawerOpen && selectedDomain"
      class="fixed inset-0 z-40 bg-black/30"
      @click.self="dnsDrawerOpen = false"
    >
      <aside
        class="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl dark:bg-gray-950"
      >
        <div class="mb-6 flex items-start justify-between">
          <div>
            <h2 class="text-lg font-semibold">DNS Instruction</h2>
            <p class="mt-1 text-sm text-gray-500">{{ selectedDomain.canonical_host }}</p>
          </div>
          <button class="rounded-lg border p-2 dark:border-gray-700" @click="dnsDrawerOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4">
          <div class="rounded-lg border p-4 dark:border-gray-800">
            <h3 class="font-semibold">Ownership TXT</h3>
            <div class="mt-3 grid gap-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Type</span>
                <code>TXT</code>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Name</span>
                <div class="flex items-center gap-2">
                  <code>{{
                    latestChallenge?.domain.id === selectedDomain.id
                      ? latestChallenge.record_name
                      : `_zyad-verification.${selectedDomain.canonical_host}`
                  }}</code>
                  <button
                    class="rounded border p-1"
                    @click="
                      copyText(
                        latestChallenge?.domain.id === selectedDomain.id
                          ? latestChallenge.record_name
                          : `_zyad-verification.${selectedDomain.canonical_host}`,
                      )
                    "
                  >
                    <Clipboard class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div class="flex items-start justify-between gap-3">
                <span class="text-gray-500">Value</span>
                <div class="flex max-w-[320px] items-start gap-2 text-right">
                  <code class="break-all">
                    {{
                      latestChallenge?.domain.id === selectedDomain.id
                        ? latestChallenge.record_value
                        : 'Token hilang? Generate ulang di bawah.'
                    }}
                  </code>
                  <button
                    v-if="latestChallenge?.domain.id === selectedDomain.id"
                    class="rounded border p-1"
                    @click="copyText(latestChallenge.record_value)"
                  >
                    <Clipboard class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-lg border p-4 dark:border-gray-800">
            <h3 class="font-semibold">Routing</h3>
            <div class="mt-3 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span>CNAME www</span>
                <div class="flex items-center gap-2">
                  <code>cname.zyad.cloud</code>
                  <button class="rounded border p-1" @click="copyText('cname.zyad.cloud')">
                    <Clipboard class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span>A @</span>
                <div class="flex items-center gap-2">
                  <code>SERVER_PUBLIC_IP</code>
                  <button class="rounded border p-1" @click="copyText('SERVER_PUBLIC_IP')">
                    <Clipboard class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <BaseButton class="w-full" :disabled="isSaving" @click="verifyDomain(selectedDomain)">
            <RefreshCw class="h-4 w-4" />
            Verify DNS
          </BaseButton>
          <BaseButton
            v-if="
              selectedDomain.type === 'custom' &&
              selectedDomain.status !== 'active' &&
              latestChallenge?.domain.id !== selectedDomain.id
            "
            class="w-full"
            variant="outline"
            :disabled="isSaving"
            @click="regenerateChallenge(selectedDomain)"
          >
            Generate Ulang Token Verifikasi
          </BaseButton>
        </div>
      </aside>
    </div>

    <div
      v-if="confirmAction"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-950">
        <h2 class="text-lg font-semibold">{{ confirmAction.title }}</h2>
        <p class="mt-2 text-sm text-gray-500">{{ confirmAction.message }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <BaseButton variant="outline" @click="confirmAction = null">Cancel</BaseButton>
          <BaseButton
            :variant="confirmAction.variant"
            :disabled="isSaving"
            @click="runConfirmedAction"
          >
            {{ confirmAction.confirmLabel }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
