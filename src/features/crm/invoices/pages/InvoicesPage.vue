<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CreditCard, Plus, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type { LineItemInput } from '@/features/crm/quotations/api/quotations.api'
import type {
  Invoice,
  InvoicePayload,
  InvoiceStatus,
} from '@/features/crm/invoices/api/invoices.api'
import {
  useCancelInvoiceMutation,
  useCreateInvoiceMutation,
  useDeleteInvoiceMutation,
  useInvoicesQuery,
  useMarkInvoicePaidMutation,
  useSendInvoiceMutation,
} from '@/features/crm/invoices/api/invoices.queries'

const statusFilter = ref<InvoiceStatus | 'all'>('all')
const params = computed(() => ({
  page: 1,
  per_page: 50,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
}))

const invoicesQuery = useInvoicesQuery(params)
const invoices = computed(() => invoicesQuery.data.value?.data ?? [])

const createMutation = useCreateInvoiceMutation()
const deleteMutation = useDeleteInvoiceMutation()
const sendMutation = useSendInvoiceMutation()
const markPaidMutation = useMarkInvoicePaidMutation()
const cancelMutation = useCancelInvoiceMutation()

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

async function handleDelete(invoice: Invoice) {
  if (!confirm(`Hapus invoice "${invoice.invoice_number}"?`)) return
  await deleteMutation.mutateAsync(invoice.id)
}

async function handleSend(invoice: Invoice) {
  await sendMutation.mutateAsync(invoice.id)
}

async function handleMarkPaid(invoice: Invoice) {
  const amount = prompt('Jumlah yang dibayar:', invoice.grand_total)
  if (!amount) return
  await markPaidMutation.mutateAsync({ id: invoice.id, amountPaid: amount })
}

async function handleCancel(invoice: Invoice) {
  if (!confirm(`Batalkan invoice "${invoice.invoice_number}"?`)) return
  await cancelMutation.mutateAsync(invoice.id)
}

// --- Create modal ---
const isModalOpen = ref(false)
const errorMessage = ref('')
const sourceMode = ref<'quotation' | 'manual'>('manual')
const form = reactive({
  invoice_number: '',
  quotation_id: '',
})
const items = ref<LineItemInput[]>([
  { description: '', quantity: '1', unit_price: '0', discount_percent: '0' },
])

function openCreateModal() {
  form.invoice_number = `INV-${Date.now()}`
  form.quotation_id = ''
  sourceMode.value = 'manual'
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
  const payload: InvoicePayload = {
    invoice_number: form.invoice_number,
  }
  if (sourceMode.value === 'quotation') {
    payload.quotation_id = form.quotation_id
  } else {
    payload.items = items.value
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
    <PageHeader title="Invoices" description="Tagihan tenant ke pelanggannya sendiri.">
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Invoice Baru
      </BaseButton>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in [
          { value: 'all', label: 'Semua' },
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'paid', label: 'Paid' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'cancelled', label: 'Cancelled' },
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
      <div v-if="invoicesQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="invoices.length === 0" class="p-12 text-center text-sm text-gray-500">
        <CreditCard class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada invoice.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nomor</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Total</th>
              <th class="px-5 py-3">Dibayar</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in invoices" :key="invoice.id" class="border-b last:border-0">
              <td class="px-5 py-3 font-medium">{{ invoice.invoice_number }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                >
                  {{ invoice.status }}
                </span>
              </td>
              <td class="px-5 py-3">{{ formatMoney(invoice.grand_total, invoice.currency) }}</td>
              <td class="px-5 py-3 text-gray-500">
                {{ formatMoney(invoice.amount_paid, invoice.currency) }}
              </td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    v-if="invoice.status === 'draft'"
                    variant="outline"
                    @click="handleSend(invoice)"
                  >
                    Send
                  </BaseButton>
                  <BaseButton
                    v-if="invoice.status === 'sent' || invoice.status === 'overdue'"
                    variant="outline"
                    @click="handleMarkPaid(invoice)"
                  >
                    Mark Paid
                  </BaseButton>
                  <BaseButton
                    v-if="invoice.status !== 'paid' && invoice.status !== 'cancelled'"
                    variant="secondary"
                    @click="handleCancel(invoice)"
                  >
                    Cancel
                  </BaseButton>
                  <BaseButton
                    v-if="invoice.status === 'draft'"
                    variant="danger"
                    @click="handleDelete(invoice)"
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

    <BaseModal :open="isModalOpen" title="Invoice Baru" @close="isModalOpen = false">
      <form class="space-y-4" @submit.prevent="submitForm">
        <TextField v-model="form.invoice_number" name="invoice_number" label="Nomor Invoice" />

        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-sm"
            :class="sourceMode === 'manual' ? 'border-brand-500 bg-brand-50 text-brand-600' : ''"
            @click="sourceMode = 'manual'"
          >
            Item Manual
          </button>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-sm"
            :class="sourceMode === 'quotation' ? 'border-brand-500 bg-brand-50 text-brand-600' : ''"
            @click="sourceMode = 'quotation'"
          >
            Dari Quotation
          </button>
        </div>

        <TextField
          v-if="sourceMode === 'quotation'"
          v-model="form.quotation_id"
          name="quotation_id"
          label="ID Quotation"
          placeholder="Salin ID dari halaman Quotations"
        />

        <div v-else class="space-y-2">
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
