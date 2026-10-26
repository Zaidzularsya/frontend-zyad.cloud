<script setup lang="ts">
import { computed, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'

import { useActivationInvoicesQuery } from '../api/activation.queries'
import RenewActivationDialog from '../components/RenewActivationDialog.vue'
import {
  canRenew,
  invoiceStateLabel,
  paymentShareUrl,
  type ActivationInvoiceFilter,
  type ActivationInvoiceRow,
  type ActivationInvoiceStatus,
} from '../utils/activation-invoices'
import { formatWib } from '../utils/activation-state'

const PER_PAGE = 20

const toast = useToast()
const status = ref<ActivationInvoiceStatus | ''>('')
const page = ref(1)

const filter = computed<ActivationInvoiceFilter>(() => ({
  ...(status.value ? { status: status.value } : {}),
  page: page.value,
  per_page: PER_PAGE,
}))
const query = useActivationInvoicesQuery(filter)

const items = computed(() => query.data.value?.items ?? [])
const meta = computed(() => query.data.value?.meta)

const filters: { key: string; value: ActivationInvoiceStatus | ''; label: string }[] = [
  { key: 'all', value: '', label: 'Semua' },
  { key: 'open', value: 'open', label: 'Menunggu pembayaran' },
  { key: 'paid', value: 'paid', label: 'Lunas' },
  { key: 'void', value: 'void', label: 'Dibatalkan' },
]

function setStatus(value: ActivationInvoiceStatus | '') {
  status.value = value
  page.value = 1
}

const stateTone: Record<string, string> = {
  awaiting_payment: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  expired: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  void: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

function money(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : formatCurrency(parsed)
}

async function copyPaymentLink(row: ActivationInvoiceRow) {
  try {
    await navigator.clipboard.writeText(row.payment_url)
    toast.success('Link pembayaran disalin.')
  } catch {
    toast.error('Gagal menyalin link pembayaran.')
  }
}

// Link pembayaran tidak berubah dan bisa dikirim ulang kapan saja; hanya preview yang perlu diperbarui.
function sendPaymentLink(row: ActivationInvoiceRow) {
  const url = paymentShareUrl(row)
  if (!url) {
    toast.error('Nomor WhatsApp pelanggan tidak valid.')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const renewRow = ref<ActivationInvoiceRow | null>(null)
const renewOpen = ref(false)

function openRenew(row: ActivationInvoiceRow) {
  renewRow.value = row
  renewOpen.value = true
}

const actionClass = 'font-semibold text-brand-600 hover:underline disabled:opacity-50'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Invoice Halaman"
      description="Invoice halaman yang Anda jual: kirim ulang link pembayaran, salin link, dan perbarui link preview."
    />

    <div class="flex flex-wrap gap-2" role="tablist" aria-label="Filter status invoice">
      <button
        v-for="f in filters"
        :key="f.key"
        type="button"
        role="tab"
        :aria-selected="status === f.value"
        :data-testid="`filter-${f.key}`"
        class="rounded-full border px-3 py-1.5 text-sm transition"
        :class="
          status === f.value
            ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950'
            : 'border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-800 dark:text-gray-300'
        "
        @click="setStatus(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="query.isPending.value" class="space-y-3" data-testid="invoices-loading">
      <div class="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900"></div>
    </div>

    <div
      v-else-if="query.isError.value"
      class="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
      data-testid="invoices-error"
    >
      <span>Gagal memuat invoice. Coba lagi.</span>
      <BaseButton variant="outline" data-testid="invoices-reload" @click="query.refetch()">
        Muat ulang
      </BaseButton>
    </div>

    <BaseCard v-else>
      <p v-if="!items.length" class="text-sm text-gray-500" data-testid="invoices-empty">
        Belum ada invoice halaman. Buat dari menu Landing Page → Create invoice.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm" data-testid="invoices-table">
          <thead class="text-xs uppercase text-gray-500">
            <tr>
              <th class="py-2 pr-4 font-medium">Pelanggan</th>
              <th class="py-2 pr-4 font-medium">Halaman</th>
              <th class="py-2 pr-4 text-right font-medium">Harga</th>
              <th class="py-2 pr-4 font-medium">Status</th>
              <th class="py-2 pr-4 font-medium">Preview berlaku sampai</th>
              <th class="py-2 font-medium"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="row in items" :key="row.id" data-testid="invoice-row">
              <td class="py-3 pr-4">
                <p class="font-medium">{{ row.buyer_name }}</p>
                <p class="text-xs text-gray-500">{{ row.buyer_contact }}</p>
              </td>
              <td class="py-3 pr-4">
                <p>{{ row.page_title }}</p>
                <p class="text-xs text-gray-500">/{{ row.page_slug }}</p>
              </td>
              <td class="py-3 pr-4 text-right tabular-nums">{{ money(row.price) }}</td>
              <td class="py-3 pr-4">
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  :class="stateTone[row.state]"
                >
                  {{ invoiceStateLabel[row.state] }}
                </span>
              </td>
              <td class="py-3 pr-4 tabular-nums">
                {{ row.status === 'open' ? formatWib(row.invoice_due_at) : '-' }}
              </td>
              <td class="py-3">
                <div class="flex flex-wrap justify-end gap-3">
                  <button
                    v-if="row.payment_url"
                    type="button"
                    :class="actionClass"
                    data-testid="copy-payment-link"
                    @click="copyPaymentLink(row)"
                  >
                    Salin link bayar
                  </button>
                  <button
                    v-if="row.payment_url && row.state !== 'paid'"
                    type="button"
                    :class="actionClass"
                    data-testid="send-payment-link"
                    @click="sendPaymentLink(row)"
                  >
                    Kirim tagihan
                  </button>
                  <button
                    v-if="canRenew(row)"
                    type="button"
                    :class="actionClass"
                    data-testid="renew-link"
                    @click="openRenew(row)"
                  >
                    Perbarui link
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="meta && meta.total_pages > 1"
        class="mt-4 flex items-center justify-end gap-3 text-sm"
      >
        <span class="text-gray-500">Halaman {{ meta.page }} dari {{ meta.total_pages }}</span>
        <BaseButton variant="outline" data-testid="page-prev" :disabled="page <= 1" @click="page--">
          Sebelumnya
        </BaseButton>
        <BaseButton
          variant="outline"
          data-testid="page-next"
          :disabled="page >= meta.total_pages"
          @click="page++"
        >
          Berikutnya
        </BaseButton>
      </div>
    </BaseCard>

    <RenewActivationDialog
      :open="renewOpen"
      :row="renewRow"
      @close="renewOpen = false"
      @renewed="query.refetch()"
    />
  </div>
</template>
