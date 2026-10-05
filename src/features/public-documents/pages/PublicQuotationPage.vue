<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { AlertTriangle, CheckCircle2, Download, FileX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { FREQUENCIES, priceSuffix } from '@/features/catalog/utils/pricing'
import { formatCurrency } from '@/lib/utils'

import { publicQuotationApi, type PublicQuotation } from '../api/public-quotation.api'
import ApproveDialog from '../components/ApproveDialog.vue'
import FloatingActions from '../components/FloatingActions.vue'
import RevisionDialog from '../components/RevisionDialog.vue'
import { categoryLabel } from '../utils/revision'

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))
const queryClient = useQueryClient()
const queryKey = computed(() => ['public-quotation', token.value])

const { data, isPending, error } = useQuery({
  queryKey,
  queryFn: () => publicQuotationApi.get(token.value),
  retry: false,
  refetchOnWindowFocus: false,
})

const notFound = computed(
  () => (error.value as { response?: { status?: number } } | null)?.response?.status === 404,
)

const dialog = ref<'approve' | 'revise' | null>(null)
const dialogError = ref('')
// Catatan yang baru dikirim: view publik tidak memuat catatan, jadi disimpan lokal untuk konfirmasi.
const submittedNote = ref('')
const justResponded = ref<'approved' | 'revision_requested' | null>(null)

function failureMessage(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: string } } } | null)
    ?.response
  switch (response?.status) {
    case 409:
      return 'Penawaran ini sudah direspons sebelumnya. Halaman diperbarui.'
    case 429:
      return 'Terlalu banyak percobaan, coba lagi nanti.'
    case 422:
      return response.data?.message ?? 'Data belum valid. Periksa isian Anda.'
    default:
      return 'Terjadi kesalahan, silakan coba lagi.'
  }
}

function onFailure(err: unknown) {
  dialogError.value = failureMessage(err)
  const status = (err as { response?: { status?: number } } | null)?.response?.status
  // 409: sudah direspons; 404: link dicabut/kedaluwarsa. Muat ulang untuk menampilkan keadaan terbaru.
  if (status === 409 || status === 404) {
    dialog.value = null
    void queryClient.invalidateQueries({ queryKey: queryKey.value })
  }
}

function onSuccess(view: PublicQuotation, kind: 'approved' | 'revision_requested') {
  queryClient.setQueryData(queryKey.value, view)
  justResponded.value = kind
  dialog.value = null
  dialogError.value = ''
}

const approveMutation = useMutation({
  mutationFn: (name: string) =>
    publicQuotationApi.approve(token.value, { responder_name: name, agree: true }),
  onSuccess: (view) => onSuccess(view, 'approved'),
  onError: onFailure,
})

const revisionMutation = useMutation({
  mutationFn: (p: { name: string; categories: string[]; note: string }) =>
    publicQuotationApi.revision(token.value, {
      responder_name: p.name,
      categories: p.categories,
      note: p.note,
    }),
  onSuccess: (view) => onSuccess(view, 'revision_requested'),
  onError: onFailure,
})

function openDialog(kind: 'approve' | 'revise') {
  dialogError.value = ''
  dialog.value = kind
}

function submitApprove(name: string) {
  if (approveMutation.isPending.value) return
  approveMutation.mutate(name)
}

function submitRevision(p: { name: string; categories: string[]; note: string }) {
  if (revisionMutation.isPending.value) return
  submittedNote.value = p.note
  revisionMutation.mutate(p)
}

const money = (value: string) => formatCurrency(Number(value), data.value?.currency ?? 'IDR')

const recurringRows = computed(() =>
  FREQUENCIES.filter((f) => data.value?.recurring_totals?.[f.value]).map((f) => ({
    label: f.label,
    amount: data.value?.recurring_totals[f.value] ?? '0',
  })),
)

const validUntil = computed(() => {
  const value = data.value?.valid_until
  if (!value) return ''
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(value),
  )
})

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
  <div class="min-h-screen bg-gray-50 pb-28 dark:bg-gray-950">
    <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p v-if="isPending" class="py-24 text-center text-sm text-gray-500" role="status">
        Memuat penawaran…
      </p>

      <section v-else-if="notFound || !data" class="py-24 text-center">
        <FileX class="mx-auto size-10 text-gray-400" aria-hidden="true" />
        <h1 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Link tidak valid atau sudah tidak berlaku.
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Hubungi pengirim penawaran untuk mendapatkan link terbaru.
        </p>
      </section>

      <template v-else>
        <header class="mb-6">
          <p class="text-sm font-medium text-gray-500">{{ data.tenant_name }}</p>
          <h1 class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Penawaran {{ data.quotation_number }}
          </h1>
          <p v-if="validUntil" class="mt-1 text-sm text-gray-500">
            Berlaku sampai {{ validUntil }}
          </p>
        </header>

        <div
          v-if="data.state === 'superseded'"
          class="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Penawaran ini sudah diperbarui.</strong> Versi ini tidak bisa disetujui lagi;
            hubungi {{ data.tenant_name }} untuk versi terbaru.
          </p>
        </div>
        <div
          v-else-if="data.state === 'expired'"
          class="mb-6 flex gap-3 rounded-xl border border-gray-300 bg-gray-100 p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Penawaran ini sudah melewati masa berlaku. Hubungi {{ data.tenant_name }} bila Anda
            masih berminat.
          </p>
        </div>
        <div
          v-else-if="data.state === 'decided'"
          class="mb-6 flex gap-3 rounded-xl border p-4 text-sm"
          :class="
            data.last_response?.action === 'revision_requested' ||
            justResponded === 'revision_requested'
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
          "
          role="status"
        >
          <CheckCircle2 class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div class="space-y-1">
            <template
              v-if="
                data.last_response?.action === 'revision_requested' ||
                justResponded === 'revision_requested'
              "
            >
              <p>
                <strong>Permintaan revisi Anda sudah kami terima.</strong> Terima kasih, tim
                {{ data.tenant_name }} akan menghubungi Anda dengan versi terbaru.
              </p>
              <p v-if="data.last_response?.categories?.length">
                Bagian yang direvisi:
                {{ data.last_response.categories.map(categoryLabel).join(', ') }}
              </p>
              <p v-if="submittedNote" class="whitespace-pre-wrap">
                Catatan Anda: {{ submittedNote }}
              </p>
            </template>
            <p
              v-else-if="data.last_response?.action === 'approved' || justResponded === 'approved'"
            >
              <strong>Terima kasih, persetujuan Anda sudah tercatat.</strong>
              {{ data.tenant_name }} akan menindaklanjuti penawaran ini.
            </p>
            <p v-else>Penawaran ini sudah diputuskan oleh {{ data.tenant_name }}.</p>
          </div>
        </div>

        <section
          class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
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
                  {{ item.quantity }}{{ item.unit ? ` ${item.unit}` : '' }} ×
                  {{ money(item.unit_price)
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
                {{ money(item.line_total) }}
              </p>
            </li>
          </ul>
          <dl class="space-y-1.5 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
            <div class="flex justify-between font-semibold text-gray-900 dark:text-gray-100">
              <dt>Total</dt>
              <dd>{{ money(data.grand_total) }}</dd>
            </div>
            <template v-if="recurringRows.length">
              <div class="flex justify-between text-gray-600 dark:text-gray-300">
                <dt>Sekali bayar</dt>
                <dd>{{ money(data.one_time_total) }}</dd>
              </div>
              <div
                v-for="row in recurringRows"
                :key="row.label"
                class="flex justify-between text-gray-600 dark:text-gray-300"
              >
                <dt>Berulang ({{ row.label }})</dt>
                <dd>{{ money(row.amount) }}</dd>
              </div>
              <div class="flex justify-between font-medium text-gray-900 dark:text-gray-100">
                <dt>Tagihan pertama</dt>
                <dd>{{ money(data.first_invoice_total) }}</dd>
              </div>
            </template>
          </dl>
        </section>

        <section class="mt-6">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Dokumen penawaran
            </h2>
            <a
              :href="publicQuotationApi.pdfUrl(token)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
            >
              <Download class="size-4" aria-hidden="true" />
              Unduh PDF
            </a>
          </div>
          <object
            :data="publicQuotationApi.pdfUrl(token)"
            type="application/pdf"
            class="h-[70vh] min-h-96 w-full rounded-xl border border-gray-200 bg-white dark:border-gray-800"
          >
            <p class="p-6 text-sm text-gray-500">
              Pratinjau PDF tidak tersedia di perangkat ini. Gunakan tombol Unduh PDF.
            </p>
          </object>
        </section>

        <FloatingActions
          v-if="data.state === 'active'"
          @approve="openDialog('approve')"
          @revise="openDialog('revise')"
        />
      </template>
    </main>

    <ApproveDialog
      :open="dialog === 'approve'"
      :pending="approveMutation.isPending.value"
      :error="dialogError"
      @close="dialog = null"
      @submit="submitApprove"
    />
    <RevisionDialog
      :open="dialog === 'revise'"
      :pending="revisionMutation.isPending.value"
      :error="dialogError"
      @close="dialog = null"
      @submit="submitRevision"
    />
  </div>
</template>
