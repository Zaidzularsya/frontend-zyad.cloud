<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { AlertTriangle, CheckCircle2, Download, FileX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { priceSuffix } from '@/features/catalog/utils/pricing'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'

import { publicInvoiceApi } from '../api/public-invoice.api'

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))

const { data, isPending, error } = useQuery({
  queryKey: computed(() => ['public-invoice', token.value]),
  queryFn: () => publicInvoiceApi.get(token.value),
  retry: false,
  refetchOnWindowFocus: false,
})

const notFound = computed(
  () => (error.value as { response?: { status?: number } } | null)?.response?.status === 404,
)

// Tanggal kalender (YYYY-MM-DD) ditampilkan apa adanya, tanpa geser zona waktu.
function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  )
}

const period = computed(() =>
  data.value?.period_start && data.value.period_end
    ? `${formatDate(data.value.period_start)} – ${formatDate(data.value.period_end)}`
    : '',
)

// Link berisi kredensial akses dokumen: jangan diindeks mesin pencari.
let robots: HTMLMetaElement | null = null
onMounted(() => {
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  document.head.appendChild(robots)
})
onBeforeUnmount(() => robots?.remove())
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-16 dark:bg-gray-950">
    <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p v-if="isPending" class="py-24 text-center text-sm text-gray-500" role="status">
        Memuat invoice…
      </p>

      <section v-else-if="notFound || !data" class="py-24 text-center">
        <FileX class="mx-auto size-10 text-gray-400" aria-hidden="true" />
        <h1 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Link tidak valid atau sudah tidak berlaku.
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Hubungi pengirim invoice untuk mendapatkan link terbaru.
        </p>
      </section>

      <template v-else>
        <header class="mb-6">
          <p class="text-sm font-medium text-gray-500">{{ data.tenant_name }}</p>
          <h1 class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Invoice {{ data.invoice_number }}
          </h1>
          <p v-if="data.issue_date" class="mt-1 text-sm text-gray-500">
            Diterbitkan {{ formatDate(data.issue_date) }}
          </p>
        </header>

        <div
          v-if="data.state === 'void'"
          class="mb-6 flex gap-3 rounded-xl border border-gray-300 bg-gray-100 p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          role="status"
        >
          <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Invoice ini dibatalkan.</strong> Tidak ada pembayaran yang perlu dilakukan.
            Hubungi {{ data.tenant_name }} bila ada pertanyaan.
          </p>
        </div>
        <div
          v-else-if="data.state === 'paid'"
          class="mb-6 flex gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          <CheckCircle2 class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p><strong>Lunas.</strong> Terima kasih, pembayaran invoice ini sudah kami terima.</p>
        </div>
        <div
          v-else-if="data.status === 'overdue'"
          class="mb-6 flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100"
          role="status"
        >
          <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Sudah lewat jatuh tempo</strong> ({{ formatDate(data.due_date) }}). Segera
            lakukan pembayaran atau hubungi {{ data.tenant_name }}.
          </p>
        </div>

        <section
          class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <dl
            class="grid gap-3 border-b border-gray-200 px-4 py-3 text-sm dark:border-gray-800 sm:grid-cols-3"
          >
            <div>
              <dt class="text-gray-500">Jatuh tempo</dt>
              <dd class="font-medium text-gray-900 dark:text-gray-100">
                {{ formatDate(data.due_date) || '-' }}
              </dd>
            </div>
            <div v-if="period">
              <dt class="text-gray-500">Periode</dt>
              <dd class="font-medium text-gray-900 dark:text-gray-100">{{ period }}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Total tagihan</dt>
              <dd class="font-medium text-gray-900 dark:text-gray-100">
                {{ formatRupiah(data.grand_total) }}
              </dd>
            </div>
          </dl>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="(item, index) in data.items"
              :key="index"
              class="flex items-start justify-between gap-4 px-4 py-3 text-sm"
            >
              <div class="min-w-0">
                <p class="font-medium break-words text-gray-900 dark:text-gray-100">
                  {{ item.description }}
                </p>
                <p class="mt-0.5 text-gray-500">
                  {{ Number(item.quantity) }}{{ item.unit ? ` ${item.unit}` : '' }} ×
                  {{ formatRupiah(item.unit_price)
                  }}{{
                    priceSuffix({
                      charge_type: item.charge_type ?? 'one_time',
                      billing_frequency: item.billing_frequency ?? null,
                      payment_timing: item.payment_timing ?? 'prepaid',
                    })
                  }}
                </p>
              </div>
              <p class="shrink-0 font-medium text-gray-900 dark:text-gray-100">
                {{ formatRupiah(item.line_total) }}
              </p>
            </li>
          </ul>

          <dl class="space-y-1.5 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
            <div class="flex justify-between font-semibold text-gray-900 dark:text-gray-100">
              <dt>Total</dt>
              <dd>{{ formatRupiah(data.grand_total) }}</dd>
            </div>
            <template v-if="data.state === 'open'">
              <div
                v-if="Number(data.amount_paid) > 0"
                class="flex justify-between text-gray-600 dark:text-gray-300"
              >
                <dt>Sudah dibayar</dt>
                <dd>{{ formatRupiah(data.amount_paid) }}</dd>
              </div>
              <div class="flex justify-between font-semibold text-gray-900 dark:text-gray-100">
                <dt>Sisa tagihan</dt>
                <dd>{{ formatRupiah(data.balance) }}</dd>
              </div>
            </template>
          </dl>
        </section>

        <!-- Slot pembayaran online: backend hanya mengirim can_pay=true bila organisasi punya
             receivable.online_payment; aksinya diisi rilis pembayaran online (S6). -->
        <div v-if="data.can_pay" class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none"
          >
            Bayar sekarang
          </button>
        </div>

        <section class="mt-6">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Dokumen invoice</h2>
            <a
              :href="publicInvoiceApi.pdfUrl(token)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
            >
              <Download class="size-4" aria-hidden="true" />
              Unduh PDF
            </a>
          </div>
          <object
            :data="publicInvoiceApi.pdfUrl(token)"
            type="application/pdf"
            class="h-[70vh] min-h-96 w-full rounded-xl border border-gray-200 bg-white dark:border-gray-800"
          >
            <p class="p-6 text-sm text-gray-500">
              Pratinjau PDF tidak tersedia di perangkat ini. Gunakan tombol Unduh PDF.
            </p>
          </object>
        </section>
      </template>
    </main>
  </div>
</template>
