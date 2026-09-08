<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, RotateCcw, Search, Trash2, Users } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type { Contact, ContactPayload } from '@/features/crm/contacts/api/contacts.api'
import {
  useContactsQuery,
  useCreateContactMutation,
  useDeleteContactMutation,
  useRestoreContactMutation,
  useUpdateContactMutation,
} from '@/features/crm/contacts/api/contacts.queries'

const search = ref('')
const page = ref(1)
const perPage = 20
const isCustomerTab = ref<'all' | 'contact' | 'customer'>('all')

const params = computed(() => ({
  page: page.value,
  per_page: perPage,
  search: search.value || undefined,
  is_customer: isCustomerTab.value === 'all' ? undefined : isCustomerTab.value === 'customer',
}))

const contactsQuery = useContactsQuery(params)
const createMutation = useCreateContactMutation()
const updateMutation = useUpdateContactMutation()
const deleteMutation = useDeleteContactMutation()
const restoreMutation = useRestoreContactMutation()

const contacts = computed(() => contactsQuery.data.value?.data ?? [])
const totalPages = computed(() => contactsQuery.data.value?.meta.total_pages ?? 1)
const totalContacts = computed(() => contactsQuery.data.value?.meta.total ?? 0)
const currentPage = computed(() => contactsQuery.data.value?.meta.page ?? page.value)

watch([search, isCustomerTab], () => {
  page.value = 1
})

function changePage(next: number) {
  if (next < 1 || next > totalPages.value) return
  page.value = next
}

const isModalOpen = ref(false)
const editingContact = ref<Contact | null>(null)
const errorMessage = ref('')
const form = reactive<ContactPayload>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  job_title: '',
})

function openCreateModal() {
  editingContact.value = null
  Object.assign(form, { first_name: '', last_name: '', email: '', phone: '', job_title: '' })
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEditModal(contact: Contact) {
  editingContact.value = contact
  Object.assign(form, {
    first_name: contact.first_name,
    last_name: contact.last_name ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    job_title: contact.job_title ?? '',
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
    if (editingContact.value) {
      await updateMutation.mutateAsync({ id: editingContact.value.id, payload: { ...form } })
    } else {
      await createMutation.mutateAsync({ ...form })
    }
    isModalOpen.value = false
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}

async function handleDelete(contact: Contact) {
  if (!confirm(`Hapus contact "${contact.first_name}"?`)) return
  await deleteMutation.mutateAsync(contact.id)
}

async function handleRestore(contact: Contact) {
  await restoreMutation.mutateAsync(contact.id)
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Contacts" description="Kelola kontak prospek dan pelanggan aktif tenant.">
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Contact Baru
      </BaseButton>
    </PageHeader>

    <div class="flex gap-2 border-b">
      <button
        v-for="tab in [
          { value: 'all', label: 'Semua' },
          { value: 'contact', label: 'Contact' },
          { value: 'customer', label: 'Customer' },
        ]"
        :key="tab.value"
        class="border-b-2 px-4 py-2 text-sm font-medium"
        :class="
          isCustomerTab === tab.value
            ? 'border-brand-500 text-brand-600 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="isCustomerTab = tab.value as typeof isCustomerTab"
      >
        {{ tab.label }}
      </button>
    </div>

    <BaseCard class="!p-0">
      <div class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative w-full max-w-sm">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama, email..."
            class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>
        <div class="text-sm text-gray-500">{{ totalContacts }} contact</div>
      </div>

      <div v-if="contactsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="contactsQuery.isError.value" class="p-12 text-center">
        <p class="font-semibold text-red-700">Data contact tidak dapat dimuat.</p>
        <button class="mt-2 text-sm font-medium text-brand-600" @click="contactsQuery.refetch()">
          Coba lagi
        </button>
      </div>
      <div v-else-if="contacts.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Users class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada contact.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nama</th>
              <th class="px-5 py-3">Kontak</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contact in contacts" :key="contact.id" class="border-b last:border-0">
              <td class="px-5 py-3 font-medium">
                {{ contact.first_name }} {{ contact.last_name }}
              </td>
              <td class="px-5 py-3 text-gray-500">{{ contact.email || contact.phone || '-' }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    contact.is_customer
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  "
                >
                  {{ contact.lifecycle_stage }}
                </span>
              </td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    v-if="!contact.deleted_at"
                    variant="outline"
                    @click="openEditModal(contact)"
                  >
                    Edit
                  </BaseButton>
                  <BaseButton
                    v-if="!contact.deleted_at"
                    variant="danger"
                    @click="handleDelete(contact)"
                  >
                    <Trash2 class="size-4" />
                  </BaseButton>
                  <BaseButton v-else variant="secondary" @click="handleRestore(contact)">
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
      :title="editingContact ? 'Edit Contact' : 'Contact Baru'"
      @close="closeModal"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <div class="grid grid-cols-2 gap-4">
          <TextField v-model="form.first_name" name="first_name" label="Nama Depan" />
          <TextField v-model="form.last_name" name="last_name" label="Nama Belakang" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <TextField v-model="form.email" name="email" label="Email" type="email" />
          <TextField v-model="form.phone" name="phone" label="Telepon" />
        </div>
        <TextField v-model="form.job_title" name="job_title" label="Jabatan" />

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
