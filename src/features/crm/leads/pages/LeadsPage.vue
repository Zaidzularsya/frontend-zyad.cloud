<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, List, Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type { Lead, LeadPayload, LeadStatus } from '@/features/crm/leads/api/leads.api'
import {
  useCreateLeadMutation,
  useUpdateLeadMutation,
} from '@/features/crm/leads/api/leads.queries'
import LeadsTable from '@/features/crm/leads/components/LeadsTable.vue'

// ApexCharts only loads when the overview tab is shown.
const LeadsOverview = defineAsyncComponent(
  () => import('@/features/crm/leads/components/LeadsOverview.vue'),
)

const route = useRoute()
const router = useRouter()

type Tab = 'overview' | 'all'
const activeTab = computed<Tab>(() => (route.query.tab === 'all' ? 'all' : 'overview'))

const tabs: { value: Tab; label: string; icon: typeof List }[] = [
  { value: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { value: 'all', label: 'Semua Lead', icon: List },
]

function selectTab(tab: Tab) {
  if (tab === activeTab.value) return
  // Table filters live in the query too; drop them when leaving the table.
  void router.replace({ query: tab === 'all' ? { tab: 'all' } : {} })
}

function openStatus(status: LeadStatus) {
  void router.replace({ query: { tab: 'all', status } })
}

const basePath = computed(() => route.path.replace(/\/$/, ''))

function openLead(id: string) {
  void router.push(`${basePath.value}/${id}`)
}

// --- Create / edit modal (shared by both tabs) ---
const createMutation = useCreateLeadMutation()
const updateMutation = useUpdateLeadMutation()

const isModalOpen = ref(false)
const editingLead = ref<Lead | null>(null)
const errorMessage = ref('')
const form = reactive<LeadPayload>({
  contact_name: '',
  company_name: '',
  email: '',
  phone: '',
  source: '',
})

function openCreateModal() {
  editingLead.value = null
  Object.assign(form, { contact_name: '', company_name: '', email: '', phone: '', source: '' })
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEditModal(lead: Lead) {
  editingLead.value = lead
  Object.assign(form, {
    contact_name: lead.contact_name,
    company_name: lead.company_name ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    source: lead.source ?? '',
  })
  errorMessage.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

async function submitForm() {
  errorMessage.value = ''
  try {
    if (editingLead.value) {
      await updateMutation.mutateAsync({ id: editingLead.value.id, payload: { ...form } })
    } else {
      await createMutation.mutateAsync({ ...form })
    }
    isModalOpen.value = false
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Leads"
      description="Pantau pertumbuhan prospek dan follow-up sebelum dikonversi menjadi contact/company."
    >
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Lead Baru
      </BaseButton>
    </PageHeader>

    <div class="flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Tampilan leads">
      <button
        v-for="tab in tabs"
        :id="`leads-tab-${tab.value}`"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.value"
        :aria-controls="`leads-panel-${tab.value}`"
        class="-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap"
        :class="
          activeTab === tab.value
            ? 'border-brand-500 font-semibold text-brand-600 dark:text-brand-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        "
        @click="selectTab(tab.value)"
      >
        <component :is="tab.icon" class="size-4" />
        {{ tab.label }}
      </button>
    </div>

    <section
      v-if="activeTab === 'overview'"
      id="leads-panel-overview"
      role="tabpanel"
      aria-labelledby="leads-tab-overview"
    >
      <LeadsOverview @open-status="openStatus" @open-lead="openLead" />
    </section>
    <section v-else id="leads-panel-all" role="tabpanel" aria-labelledby="leads-tab-all">
      <LeadsTable @edit="openEditModal" @open="(lead) => openLead(lead.id)" />
    </section>

    <BaseModal
      :open="isModalOpen"
      :title="editingLead ? 'Edit Lead' : 'Lead Baru'"
      @close="closeModal"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <TextField v-model="form.contact_name" name="contact_name" label="Nama Kontak" />
        <TextField v-model="form.company_name" name="company_name" label="Nama Company" />
        <div class="grid grid-cols-2 gap-4">
          <TextField v-model="form.email" name="email" label="Email" type="email" />
          <TextField v-model="form.phone" name="phone" label="Telepon" />
        </div>
        <TextField
          v-model="form.source"
          name="source"
          label="Sumber"
          placeholder="Website, referral, ..."
        />

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton type="button" variant="secondary" @click="closeModal">Batal</BaseButton>
          <BaseButton type="submit" :disabled="isSaving">
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
