<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { FileText, Plus, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type {
  LineItemInput,
  Quotation,
  QuotationPayload,
  QuotationStatus,
} from '@/features/crm/quotations/api/quotations.api'
import {
  useApproveQuotationMutation,
  useCreateQuotationMutation,
  useDeleteQuotationMutation,
  useQuotationsQuery,
  useRejectQuotationMutation,
  useSendQuotationMutation,
} from '@/features/crm/quotations/api/quotations.queries'

const statusFilter = ref<QuotationStatus | 'all'>('all')
const params = computed(() => ({
  page: 1,
  per_page: 50,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
}))

const quotationsQuery = useQuotationsQuery(params)
const quotations = computed(() => quotationsQuery.data.value?.data ?? [])

const createMutation = useCreateQuotationMutation()
const deleteMutation = useDeleteQuotationMutation()
const sendMutation = useSendQuotationMutation()
const approveMutation = useApproveQuotationMutation()
const rejectMutation = useRejectQuotationMutation()

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

function formatMoney(value: string, currency: string) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return `${currency} ${value}`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency || 'IDR' }).format(
    amount,
  )
}

async function handleDelete(quotation: Quotation) {
  if (!confirm(`Hapus quotation "${quotation.quotation_number}"?`)) return
  await deleteMutation.mutateAsync(quotation.id)
}

async function handleSend(quotation: Quotation) {
  await sendMutation.mutateAsync(quotation.id)
}

async function handleApprove(quotation: Quotation) {
  await approveMutation.mutateAsync(quotation.id)
}

async function handleReject(quotation: Quotation) {
  await rejectMutation.mutateAsync(quotation.id)
}

// --- Create modal ---
const isModalOpen = ref(false)
const errorMessage = ref('')
const form = reactive({
  quotation_number: '',
  notes: '',
})
const items = ref<LineItemInput[]>([
  { description: '', quantity: '1', unit_price: '0', discount_percent: '0' },
])

const previewTotal = computed(() => {
  return items.value.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const discount = Number(item.discount_percent) || 0
    return sum + qty * price * (1 - discount / 100)
  }, 0)
})

function openCreateModal() {
  form.quotation_number = `Q-${Date.now()}`
  form.notes = ''
  items.value = [{ description: '', quantity: '1', unit_price: '0', discount_percent: '0' }]
  errorMessage.value = ''
  isModalOpen.value = true
}

function addItem() {
  items.value.push({ description: '', quantity: '1', unit_price: '0', discount_percent: '0' })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

async function submitForm() {
  errorMessage.value = ''
  const payload: QuotationPayload = {
    quotation_number: form.quotation_number,
    notes: form.notes,
    items: items.value,
  }
  try {
    await createMutation.mutateAsync(payload)
    isModalOpen.value = false
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Quotations" description="Penawaran harga ke calon customer.">
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Quotation Baru
      </BaseButton>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in [
          { value: 'all', label: 'Semua' },
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]"
        :key="tab.value"
        class="border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap"
        :class="
          statusFilter === tab.value
            ? 'border-brand-500 text-brand-600 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="statusFilter = tab.value as typeof statusFilter"
      >
        {{ tab.label }}
      </button>
    </div>

    <BaseCard class="!p-0">
      <div v-if="quotationsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="quotations.length === 0" class="p-12 text-center text-sm text-gray-500">
        <FileText class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada quotation.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nomor</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Total</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="quotation in quotations" :key="quotation.id" class="border-b last:border-0">
              <td class="px-5 py-3 font-medium">{{ quotation.quotation_number }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                >
                  {{ quotation.status }}
                </span>
              </td>
              <td class="px-5 py-3">
                {{ formatMoney(quotation.grand_total, quotation.currency) }}
              </td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    v-if="quotation.status === 'draft'"
                    variant="outline"
                    @click="handleSend(quotation)"
                  >
                    Send
                  </BaseButton>
                  <BaseButton
                    v-if="quotation.status === 'sent'"
                    variant="outline"
                    @click="handleApprove(quotation)"
                  >
                    Approve
                  </BaseButton>
                  <BaseButton
                    v-if="quotation.status === 'sent'"
                    variant="secondary"
                    @click="handleReject(quotation)"
                  >
                    Reject
                  </BaseButton>
                  <BaseButton
                    v-if="quotation.status === 'draft'"
                    variant="danger"
                    @click="handleDelete(quotation)"
                  >
                    <Trash2 class="size-4" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <BaseModal :open="isModalOpen" title="Quotation Baru" @close="isModalOpen = false">
      <form class="space-y-4" @submit.prevent="submitForm">
        <TextField
          v-model="form.quotation_number"
          name="quotation_number"
          label="Nomor Quotation"
        />

        <div class="space-y-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Item</span>
          <div
            v-for="(item, index) in items"
            :key="index"
            class="grid grid-cols-12 items-center gap-2"
          >
            <input
              v-model="item.description"
              type="text"
              placeholder="Deskripsi"
              class="col-span-5 rounded-lg border bg-white px-2 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <input
              v-model="item.quantity"
              type="text"
              placeholder="Qty"
              class="col-span-2 rounded-lg border bg-white px-2 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <input
              v-model="item.unit_price"
              type="text"
              placeholder="Harga"
              class="col-span-3 rounded-lg border bg-white px-2 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <input
              v-model="item.discount_percent"
              type="text"
              placeholder="Disc %"
              class="col-span-1 rounded-lg border bg-white px-2 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <button
              type="button"
              class="col-span-1 text-gray-400 hover:text-red-600"
              @click="removeItem(index)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
          <BaseButton type="button" variant="outline" @click="addItem">
            <Plus class="size-4" />
            Tambah Item
          </BaseButton>
        </div>

        <TextField v-model="form.notes" name="notes" label="Catatan" />

        <p class="text-sm font-medium">
          Perkiraan total: {{ previewTotal.toLocaleString('id-ID') }}
        </p>
        <p class="text-xs text-gray-500">
          Total final dihitung ulang oleh server saat quotation disimpan.
        </p>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton type="button" variant="secondary" @click="isModalOpen = false"
            >Batal</BaseButton
          >
          <BaseButton type="submit" :disabled="createMutation.isPending.value">
            {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
