<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Building2, Plus, RotateCcw, Search, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type { Company, CompanyPayload } from '@/features/crm/companies/api/companies.api'
import {
  useCompaniesQuery,
  useCreateCompanyMutation,
  useDeleteCompanyMutation,
  useRestoreCompanyMutation,
  useUpdateCompanyMutation,
} from '@/features/crm/companies/api/companies.queries'

const search = ref('')
const page = ref(1)
const perPage = 20

const params = computed(() => ({
  page: page.value,
  per_page: perPage,
  search: search.value || undefined,
}))

const companiesQuery = useCompaniesQuery(params)
const createMutation = useCreateCompanyMutation()
const updateMutation = useUpdateCompanyMutation()
const deleteMutation = useDeleteCompanyMutation()
const restoreMutation = useRestoreCompanyMutation()

const companies = computed(() => companiesQuery.data.value?.data ?? [])
const totalPages = computed(() => companiesQuery.data.value?.meta.total_pages ?? 1)
const totalCompanies = computed(() => companiesQuery.data.value?.meta.total ?? 0)
const currentPage = computed(() => companiesQuery.data.value?.meta.page ?? page.value)

watch(search, () => {
  page.value = 1
})

function changePage(next: number) {
  if (next < 1 || next > totalPages.value) return
  page.value = next
}

const isModalOpen = ref(false)
const editingCompany = ref<Company | null>(null)
const errorMessage = ref('')
const form = reactive<CompanyPayload>({
  name: '',
  industry: '',
  website: '',
  phone: '',
  email: '',
})

function openCreateModal() {
  editingCompany.value = null
  Object.assign(form, { name: '', industry: '', website: '', phone: '', email: '' })
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEditModal(company: Company) {
  editingCompany.value = company
  Object.assign(form, {
    name: company.name,
    industry: company.industry ?? '',
    website: company.website ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
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
    if (editingCompany.value) {
      await updateMutation.mutateAsync({ id: editingCompany.value.id, payload: { ...form } })
    } else {
      await createMutation.mutateAsync({ ...form })
    }
    isModalOpen.value = false
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}

async function handleDelete(company: Company) {
  if (!confirm(`Hapus company "${company.name}"?`)) return
  await deleteMutation.mutateAsync(company.id)
}

async function handleRestore(company: Company) {
  await restoreMutation.mutateAsync(company.id)
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Companies"
      description="Kelola data perusahaan prospek dan pelanggan tenant."
    >
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Company Baru
      </BaseButton>
    </PageHeader>

    <BaseCard class="!p-0">
      <div class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative w-full max-w-sm">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama company..."
            class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>
        <div class="text-sm text-gray-500">{{ totalCompanies }} company</div>
      </div>

      <div v-if="companiesQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="companiesQuery.isError.value" class="p-12 text-center">
        <p class="font-semibold text-red-700">Data company tidak dapat dimuat.</p>
        <button class="mt-2 text-sm font-medium text-brand-600" @click="companiesQuery.refetch()">
          Coba lagi
        </button>
      </div>
      <div v-else-if="companies.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Building2 class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada company.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nama</th>
              <th class="px-5 py-3">Industri</th>
              <th class="px-5 py-3">Kontak</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="company in companies" :key="company.id" class="border-b last:border-0">
              <td class="px-5 py-3 font-medium">{{ company.name }}</td>
              <td class="px-5 py-3 text-gray-500">{{ company.industry || '-' }}</td>
              <td class="px-5 py-3 text-gray-500">{{ company.email || company.phone || '-' }}</td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    v-if="!company.deleted_at"
                    variant="outline"
                    @click="openEditModal(company)"
                  >
                    Edit
                  </BaseButton>
                  <BaseButton
                    v-if="!company.deleted_at"
                    variant="danger"
                    @click="handleDelete(company)"
                  >
                    <Trash2 class="size-4" />
                  </BaseButton>
                  <BaseButton v-else variant="secondary" @click="handleRestore(company)">
                    <RotateCcw class="size-4" />
                    Restore
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-500">Halaman {{ currentPage }} dari {{ totalPages }}.</p>
        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            :disabled="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          >
            Sebelumnya
          </BaseButton>
          <BaseButton
            variant="secondary"
            :disabled="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
          >
            Berikutnya
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <BaseModal
      :open="isModalOpen"
      :title="editingCompany ? 'Edit Company' : 'Company Baru'"
      @close="closeModal"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <TextField
          v-model="form.name"
          name="name"
          label="Nama Company"
          placeholder="PT Contoh Sejahtera"
        />
        <TextField v-model="form.industry" name="industry" label="Industri" placeholder="Retail" />
        <div class="grid grid-cols-2 gap-4">
          <TextField v-model="form.phone" name="phone" label="Telepon" />
          <TextField v-model="form.email" name="email" label="Email" type="email" />
        </div>
        <TextField v-model="form.website" name="website" label="Website" placeholder="https://" />

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
