<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Banknote, Download, Link2, Pencil, Send, XCircle } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import { priceSuffix } from '@/features/catalog/utils/pricing'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import { receivableApi, type SendChannel } from '@/features/receivable/api/receivable.api'
import {
  useInvoiceLinkMutation,
  useInvoicePaymentsQuery,
  useInvoiceQuery,
  useInvoiceSendsQuery,
  useIssueInvoiceMutation,
} from '@/features/receivable/api/receivable.queries'
import InvoiceSendHistory from '@/features/receivable/components/InvoiceSendHistory.vue'
import RecordPaymentDialog from '@/features/receivable/components/RecordPaymentDialog.vue'
import SendInvoiceDialog from '@/features/receivable/components/SendInvoiceDialog.vue'
import VoidInvoiceDialog from '@/features/receivable/components/VoidInvoiceDialog.vue'
import { receivableErrorMessage } from '@/features/receivable/utils/errors'
import {
  INVOICE_STATUS,
  canIssue,
  canPay,
  canSend,
  canVoid,
  isEditable,
} from '@/features/receivable/utils/invoice-status'
import { invoiceChannelAvailability } from '@/features/receivable/utils/send-invoice'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const invoiceId = computed(() => String(route.params.id ?? ''))
// Prefix menu (tenant /app/billing atau platform) diambil dari path saat ini.
const base = computed(() => route.path.replace(/\/invoices\/[^/]+$/, ''))

const invoiceQuery = useInvoiceQuery(invoiceId)
const sendsQuery = useInvoiceSendsQuery(invoiceId)
const paymentsQuery = useInvoicePaymentsQuery(invoiceId)
const invoice = computed(() => invoiceQuery.data.value)
const sends = computed(() => sendsQuery.data.value ?? [])
const payments = computed(() => paymentsQuery.data.value ?? [])

const issueMutation = useIssueInvoiceMutation()
const linkMutation = useInvoiceLinkMutation()

const sendOpen = ref(false)
const sendChannel = ref<SendChannel | undefined>()
const payOpen = ref(false)
const voidOpen = ref(false)
const errorMessage = ref('')

const status = computed(() => (invoice.value ? INVOICE_STATUS[invoice.value.status] : undefined))
const toneClass: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-200 text-slate-700',
}

const availability = computed(() =>
  invoiceChannelAvailability({
    accountHasContact: Boolean(invoice.value?.account.contact_id),
    canEmail: auth.can('email.send'),
    canWhatsApp: auth.can('whatsapp.message.send'),
  }),
)

const hasPayments = computed(() => Number(invoice.value?.amount_paid ?? '0') > 0)

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

async function issue() {
  if (!invoice.value) return
  errorMessage.value = ''
  try {
    await issueMutation.mutateAsync(invoice.value.id)
    toast.success('Invoice diterbitkan.')
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'Invoice gagal diterbitkan. Coba lagi.')
  }
}

async function copyLink() {
  if (!invoice.value) return
  errorMessage.value = ''
  try {
    const link = await linkMutation.mutateAsync(invoice.value.id)
    await navigator.clipboard.writeText(link.url)
    toast.success('Link invoice disalin.')
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'Link tidak dapat disalin.')
  }
}

function openSend(channel?: SendChannel) {
  sendChannel.value = channel
  sendOpen.value = true
}

// Pratinjau PDF: blob diambil lewat API terautentikasi lalu ditampilkan di <object>.
const pdfUrl = ref('')
let pdfRequest = 0

function releasePdf() {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
}

watch(
  () => [invoice.value?.id, invoice.value?.status, invoice.value?.amount_paid] as const,
  async ([id]) => {
    const ticket = ++pdfRequest
    if (!id || typeof URL.createObjectURL !== 'function') return
    try {
      const blob = await receivableApi.invoices.pdf(id)
      if (ticket !== pdfRequest) return
      releasePdf()
      pdfUrl.value = URL.createObjectURL(blob)
    } catch {
      releasePdf()
    }
  },
  { immediate: true },
)
onBeforeUnmount(releasePdf)

async function downloadPdf() {
  if (!invoice.value) return
  try {
    const blob = await receivableApi.invoices.pdf(invoice.value.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.value.invoice_number ?? 'invoice-draft'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'PDF tidak dapat diunduh.')
  }
}
</script>

<template>
  <div class="space-y-5">
    <RouterLink
      :to="`${base}/invoices`"
      class="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600"
    >
      <ArrowLeft class="size-4" /> Semua invoice
    </RouterLink>

    <p v-if="invoiceQuery.isPending.value" class="text-sm text-gray-500">Memuat...</p>
    <p v-else-if="invoiceQuery.isError.value || !invoice" class="text-sm text-red-600" role="alert">
      Invoice tidak ditemukan.
    </p>

    <template v-else>
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <h1 class="text-xl font-semibold">{{ invoice.invoice_number ?? 'Draft invoice' }}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ invoice.account.name
            }}<span v-if="invoice.account.company_name"> · {{ invoice.account.company_name }}</span>
          </p>
        </div>
        <span
          v-if="status"
          class="rounded-full px-3 py-1 text-xs font-semibold"
          :class="toneClass[status.tone]"
          >{{ status.label }}</span
        >
      </header>

      <div class="flex flex-wrap gap-2">
        <BaseButton
          v-if="canIssue(invoice.status) && auth.can('invoice.send')"
          :disabled="issueMutation.isPending.value"
          @click="issue"
        >
          <Send class="size-4" /> Terbitkan
        </BaseButton>
        <BaseButton
          v-if="isEditable(invoice.status) && auth.can('invoice.update')"
          variant="secondary"
          @click="router.push(`${base}/invoices/${invoice.id}/edit`)"
        >
          <Pencil class="size-4" /> Edit
        </BaseButton>
        <BaseButton
          v-if="canSend(invoice.status) && auth.can('invoice.send')"
          variant="secondary"
          @click="openSend()"
        >
          <Send class="size-4" /> Kirim…
        </BaseButton>
        <BaseButton
          v-if="canPay(invoice.status) && auth.can('invoice.mark_paid')"
          variant="secondary"
          @click="payOpen = true"
        >
          <Banknote class="size-4" /> Catat pembayaran
        </BaseButton>
        <BaseButton
          v-if="canSend(invoice.status) && auth.can('invoice.send')"
          variant="secondary"
          :disabled="linkMutation.isPending.value"
          @click="copyLink"
        >
          <Link2 class="size-4" /> Salin link
        </BaseButton>
        <BaseButton variant="outline" @click="downloadPdf"
          ><Download class="size-4" /> Unduh PDF</BaseButton
        >
        <BaseButton
          v-if="canVoid(invoice.status, invoice.amount_paid) && auth.can('invoice.void')"
          variant="danger"
          @click="voidOpen = true"
        >
          <XCircle class="size-4" /> Batalkan
        </BaseButton>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
      <p
        v-if="invoice.status === 'void'"
        class="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm dark:bg-slate-900"
      >
        Invoice ini dibatalkan<span v-if="invoice.void_reason">: {{ invoice.void_reason }}</span
        >.
      </p>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="space-y-5 lg:col-span-2">
          <BaseCard>
            <dl class="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt class="text-gray-500">Tanggal terbit</dt>
                <dd>{{ formatDate(invoice.issue_date) }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Jatuh tempo</dt>
                <dd>{{ formatDate(invoice.due_date) }}</dd>
              </div>
              <div v-if="invoice.period_start && invoice.period_end">
                <dt class="text-gray-500">Periode</dt>
                <dd>
                  {{ formatDate(invoice.period_start) }} – {{ formatDate(invoice.period_end) }}
                </dd>
              </div>
            </dl>
          </BaseCard>

          <BaseCard>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[560px] text-left text-sm">
                <thead class="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th class="py-2 pr-2">Deskripsi</th>
                    <th class="py-2 pr-2 text-right">Qty</th>
                    <th class="py-2 pr-2 text-right">Harga</th>
                    <th class="py-2 pr-2 text-right">Diskon</th>
                    <th class="py-2 pr-2 text-right">Pajak</th>
                    <th class="py-2 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in invoice.items" :key="it.id" class="border-b last:border-0">
                    <td class="py-2 pr-2">
                      {{ it.description }}
                      <span
                        v-if="it.charge_type === 'recurring' || it.payment_timing === 'postpaid'"
                        class="block text-xs text-gray-500"
                      >
                        {{ it.charge_type === 'recurring' ? 'Berulang' : 'Sekali bayar' }} ·
                        {{ it.payment_timing === 'postpaid' ? 'Pascabayar' : 'Prabayar' }}
                      </span>
                    </td>
                    <td class="py-2 pr-2 text-right">{{ Number(it.quantity) }} {{ it.unit }}</td>
                    <td class="py-2 pr-2 text-right">
                      {{ formatRupiah(it.unit_price)
                      }}{{
                        priceSuffix({
                          charge_type: it.charge_type,
                          billing_frequency: it.billing_frequency,
                          payment_timing: it.payment_timing,
                        })
                      }}
                    </td>
                    <td class="py-2 pr-2 text-right">
                      {{ it.discount_percent ? `${Number(it.discount_percent)}%` : '-' }}
                    </td>
                    <td class="py-2 pr-2 text-right">
                      {{ Number(it.tax_percent) ? `${Number(it.tax_percent)}%` : '-' }}
                    </td>
                    <td class="py-2 text-right">{{ formatRupiah(it.line_total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <dl class="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
              <div class="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{{ formatRupiah(invoice.subtotal) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt>Diskon</dt>
                <dd>{{ formatRupiah(invoice.discount_total) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt>Pajak</dt>
                <dd>{{ formatRupiah(invoice.tax_total) }}</dd>
              </div>
              <div class="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{{ formatRupiah(invoice.grand_total) }}</dd>
              </div>
              <template v-if="hasPayments">
                <div class="flex justify-between">
                  <dt>Dibayar</dt>
                  <dd>{{ formatRupiah(invoice.amount_paid) }}</dd>
                </div>
                <div class="flex justify-between font-semibold">
                  <dt>Sisa</dt>
                  <dd>{{ formatRupiah(invoice.balance) }}</dd>
                </div>
              </template>
            </dl>
          </BaseCard>

          <BaseCard>
            <h2 class="mb-2 text-sm font-semibold">Pembayaran</h2>
            <p v-if="payments.length === 0" class="text-sm text-gray-500">Belum ada pembayaran.</p>
            <ul v-else class="divide-y text-sm">
              <li
                v-for="p in payments"
                :key="p.id"
                class="flex flex-wrap justify-between gap-2 py-2"
              >
                <span>
                  {{ formatDateTime(p.paid_at) }}
                  <span v-if="p.reference" class="text-gray-500"> · {{ p.reference }}</span>
                  <span v-if="p.note" class="block text-xs text-gray-500">{{ p.note }}</span>
                </span>
                <strong>{{ formatRupiah(p.amount) }}</strong>
              </li>
            </ul>
          </BaseCard>

          <BaseCard>
            <InvoiceSendHistory
              :sends="sends"
              :can-retry="canSend(invoice.status) && auth.can('invoice.send')"
              @retry="openSend"
            />
          </BaseCard>
        </div>

        <BaseCard class="lg:sticky lg:top-4 lg:self-start">
          <h2 class="mb-2 text-sm font-semibold">Pratinjau PDF</h2>
          <object
            v-if="pdfUrl"
            :data="pdfUrl"
            type="application/pdf"
            class="h-[520px] w-full rounded border"
          >
            <p class="p-3 text-sm text-gray-500">
              Pratinjau tidak tersedia di browser ini. Gunakan “Unduh PDF”.
            </p>
          </object>
          <p v-else class="text-sm text-gray-500">Pratinjau PDF belum tersedia.</p>
        </BaseCard>
      </div>

      <SendInvoiceDialog
        :open="sendOpen"
        :invoice="invoice"
        :availability="availability"
        :initial-channel="sendChannel"
        @close="sendOpen = false"
      />
      <RecordPaymentDialog :open="payOpen" :invoice="invoice" @close="payOpen = false" />
      <VoidInvoiceDialog :open="voidOpen" :invoice="invoice" @close="voidOpen = false" />
    </template>
  </div>
</template>
