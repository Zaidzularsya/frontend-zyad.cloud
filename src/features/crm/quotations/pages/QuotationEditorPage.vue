<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Download, Eye, FileText, Send, Trash2 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import type { CatalogProduct } from '@/features/catalog/api/catalog.api'
import { useContactQuery } from '@/features/crm/contacts/api/contacts.queries'
import { useDealQuery } from '@/features/crm/deals/api/deals.queries'
import {
  quotationsApi,
  type Quotation,
  type QuotationStatus,
} from '@/features/crm/quotations/api/quotations.api'
import {
  useCreateQuotationMutation,
  useDeleteQuotationMutation,
  useMarkQuotationSentMutation,
  useQuotationQuery,
  useReviseQuotationMutation,
  useUpdateQuotationMutation,
} from '@/features/crm/quotations/api/quotations.queries'
import ProductPicker from '@/features/crm/quotations/components/ProductPicker.vue'
import QuotationDecisionDialogs from '@/features/crm/quotations/components/QuotationDecisionDialogs.vue'
import QuotationItemsTable from '@/features/crm/quotations/components/QuotationItemsTable.vue'
import QuotationSendHistory from '@/features/crm/quotations/components/QuotationSendHistory.vue'
import SendQuotationDialog from '@/features/crm/quotations/components/SendQuotationDialog.vue'
import { channelAvailability } from '@/features/crm/quotations/utils/send-quotation'
import { useMailboxesQuery } from '@/features/email/api/email.queries'
import { useSessionsQuery } from '@/features/whatsapp/api/whatsapp.queries'
import { quotationErrorCode, quotationErrorMessage } from '@/features/crm/quotations/utils/errors'
import {
  buildItemsPayload,
  computeTotals,
  formatRupiah,
  lineFromProduct,
  linesFromQuotation,
  validateLines,
  type EditorLine,
} from '@/features/crm/quotations/utils/quotation-editor'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const routeId = computed(() => String(route.params.id ?? ''))
const isNew = computed(() => routeId.value === 'new')
// Prefix menu (tenant /crm/ atau platform) diambil dari path saat ini.
const base = computed(() => route.path.replace(/quotations\/[^/]+$/, ''))

const quotationQuery = useQuotationQuery(computed(() => (isNew.value ? undefined : routeId.value)))
const quotation = computed(() => quotationQuery.data.value)
const dealId = computed(() =>
  isNew.value
    ? typeof route.query.deal_id === 'string'
      ? route.query.deal_id
      : ''
    : (quotation.value?.deal_id ?? ''),
)
const dealQuery = useDealQuery(computed(() => dealId.value || undefined))
const deal = computed(() => dealQuery.data.value)
const parentQuery = useQuotationQuery(computed(() => quotation.value?.revision_of_id ?? undefined))

const lines = ref<EditorLine[]>([])
const validUntil = ref('')
const notes = ref('')
const savedSnapshot = ref('')
const errorMessage = ref('')
const lockedNotice = ref(false)

function snapshot() {
  return JSON.stringify({
    items: buildItemsPayload(lines.value),
    validUntil: validUntil.value,
    notes: notes.value,
  })
}
const dirty = computed(() => snapshot() !== savedSnapshot.value)

function isoDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function defaultValidUntil() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function hydrate(q: Quotation | undefined) {
  if (q) {
    lines.value = linesFromQuotation(q)
    validUntil.value = isoDate(q.valid_until)
    notes.value = q.notes ?? ''
  } else {
    lines.value = []
    validUntil.value = defaultValidUntil()
    notes.value = ''
  }
  savedSnapshot.value = snapshot()
}

// Isi ulang form saat quotation lain dibuka atau server mengembalikan versi
// baru (angka resmi setelah simpan) — tidak menimpa perubahan yang belum disimpan.
watch(
  () => [routeId.value, quotation.value?.id, quotation.value?.updated_at] as const,
  ([, id], old) => {
    if (isNew.value) {
      if (!old || old[0] !== routeId.value) hydrate(undefined)
      return
    }
    if (!quotation.value) return
    if (!old || old[1] !== id || !dirty.value) hydrate(quotation.value)
  },
  { immediate: true },
)

const totals = computed(() => computeTotals(lines.value))
const status = computed<QuotationStatus>(() => quotation.value?.status ?? 'draft')
const readonly = computed(() => !isNew.value && status.value !== 'draft')
const canEdit = computed(() =>
  isNew.value ? auth.can('quotation.create') : auth.can('quotation.update'),
)
const editable = computed(() => !readonly.value && canEdit.value)

const statusMeta: Record<QuotationStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  sent: { label: 'Terkirim', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  approved: {
    label: 'Disetujui',
    cls: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  expired: {
    label: 'Kedaluwarsa',
    cls: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  superseded: {
    label: 'Digantikan',
    cls: 'bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-400',
  },
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

const legacyTaxNotice = computed(() => {
  const q = quotation.value
  const parent = parentQuery.data.value
  if (!q || !parent || q.status !== 'draft') return false
  const parentHasHeaderTax = Number(parent.tax_total) !== 0
  const parentLineTax = parent.items.some((it) => Number(it.tax_percent ?? 0) !== 0)
  return parentHasHeaderTax && !parentLineTax
})

// --- Aksi ---
const createMutation = useCreateQuotationMutation()
const updateMutation = useUpdateQuotationMutation()
const deleteMutation = useDeleteQuotationMutation()
const reviseMutation = useReviseQuotationMutation()
const markSentMutation = useMarkQuotationSentMutation()
const pickerOpen = ref(false)
const decision = ref<'approve' | 'reject' | null>(null)
const pdfBusy = ref(false)
let allowLeave = false

function handleError(error: unknown) {
  if (quotationErrorCode(error) === 'QUOTATION_LOCKED') {
    lockedNotice.value = true
    savedSnapshot.value = snapshot()
    void quotationQuery.refetch()
  }
  errorMessage.value = quotationErrorMessage(error)
}

async function save(): Promise<string | null> {
  const invalid = validateLines(lines.value)
  if (invalid) {
    errorMessage.value = invalid
    return null
  }
  errorMessage.value = ''
  const items = buildItemsPayload(lines.value)
  try {
    if (isNew.value) {
      const created = await createMutation.mutateAsync({
        deal_id: dealId.value,
        valid_until: validUntil.value || undefined,
        notes: notes.value,
        items,
      })
      savedSnapshot.value = snapshot()
      allowLeave = true
      await router.replace(`${base.value}quotations/${created.id}`)
      allowLeave = false
      return created.id
    }
    await updateMutation.mutateAsync({
      id: routeId.value,
      payload: { valid_until: validUntil.value || undefined, notes: notes.value, items },
    })
    savedSnapshot.value = snapshot()
    return routeId.value
  } catch (error) {
    handleError(error)
    return null
  }
}

async function fetchPdf(id: string) {
  pdfBusy.value = true
  try {
    return await quotationsApi.pdf(id)
  } catch (error) {
    handleError(error)
    return null
  } finally {
    pdfBusy.value = false
  }
}

async function previewPdf() {
  // Buka tab dulu (masih dalam gesture klik) agar tidak diblokir popup blocker.
  const win = window.open('', '_blank')
  const id = isNew.value || dirty.value ? await save() : routeId.value
  const blob = id ? await fetchPdf(id) : null
  if (!blob) {
    win?.close()
    return
  }
  const url = URL.createObjectURL(blob)
  if (win) win.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function downloadPdf() {
  const q = quotation.value
  if (!q) return
  const blob = await fetchPdf(q.id)
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${q.quotation_number}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

async function markSent() {
  if (!confirm('PDF final akan dikunci dan quotation tidak bisa diubah lagi. Lanjutkan?')) return
  const id = dirty.value ? await save() : routeId.value
  if (!id) return
  try {
    await markSentMutation.mutateAsync(id)
  } catch (error) {
    handleError(error)
  }
}

async function revise() {
  const q = quotation.value
  if (!q) return
  decision.value = null
  try {
    const next = await reviseMutation.mutateAsync(q.id)
    await router.push(`${base.value}quotations/${next.id}`)
  } catch (error) {
    handleError(error)
  }
}

async function remove() {
  const q = quotation.value
  if (!q || !confirm(`Hapus quotation "${q.quotation_number}"?`)) return
  try {
    await deleteMutation.mutateAsync(q.id)
    savedSnapshot.value = snapshot()
    await router.push(
      dealId.value ? `${base.value}deals/${dealId.value}` : `${base.value}quotations`,
    )
  } catch (error) {
    handleError(error)
  }
}

function addProduct(product: CatalogProduct) {
  lines.value = [...lines.value, lineFromProduct(product)]
  pickerOpen.value = false
}

// Peringatan keluar halaman bila ada perubahan belum disimpan.
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (editable.value && dirty.value) event.preventDefault()
}
let removeGuard: (() => void) | undefined
onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  removeGuard = router.beforeEach((to, from) => {
    if (allowLeave || from.path === to.path || !editable.value || !dirty.value) return true
    return confirm('Perubahan belum disimpan. Tinggalkan halaman ini?')
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  removeGuard?.()
})

// --- Kirim via Email / WhatsApp ---
const sendOpen = ref(false)
const contactQuery = useContactQuery(computed(() => quotation.value?.contact_id ?? ''))
const contact = computed(() => contactQuery.data.value ?? null)
const mailboxesQuery = useMailboxesQuery(computed(() => !isNew.value && auth.can('email.send')))
const activeMailboxes = computed(() =>
  (mailboxesQuery.data.value ?? []).filter((mb) => mb.status === 'active'),
)
const canReadSessions = computed(() => auth.can('whatsapp.session.read'))
const sessionsQuery = useSessionsQuery(computed(() => !isNew.value && canReadSessions.value))
const connectedSessions = computed(() =>
  (sessionsQuery.data.value ?? []).filter((session) => session.status === 'WORKING'),
)
const availability = computed(() =>
  channelAvailability({
    contactEmail: contact.value?.email,
    contactPhone: contact.value?.phone,
    hasActiveMailbox: activeMailboxes.value.length > 0,
    // Tanpa izin baca session, anggap tersedia dan biarkan server yang memvalidasi.
    hasConnectedSession: !canReadSessions.value || connectedSessions.value.length > 0,
    canEmail: auth.can('email.send'),
    canWhatsApp: auth.can('whatsapp.message.send'),
  }),
)
const canSend = computed(
  () => !isNew.value && ['draft', 'sent'].includes(status.value) && auth.can('quotation.send'),
)

async function openSend() {
  if (dirty.value && editable.value && !(await save())) return
  sendOpen.value = true
}

const busy = computed(
  () =>
    createMutation.isPending.value ||
    updateMutation.isPending.value ||
    markSentMutation.isPending.value ||
    reviseMutation.isPending.value ||
    pdfBusy.value,
)
</script>

<template>
  <div class="space-y-4">
    <button
      class="inline-flex items-center gap-2 text-sm text-gray-600"
      @click="router.push(dealId ? `${base}deals/${dealId}` : `${base}quotations`)"
    >
      <ArrowLeft class="size-4" />
      {{ dealId ? 'Kembali ke deal' : 'Kembali ke daftar quotation' }}
    </button>

    <BaseCard v-if="isNew && !dealId" class="p-8 text-center text-sm">
      <p>Quotation dibuat dari halaman Deal.</p>
      <RouterLink :to="`${base}deals`" class="mt-2 inline-block font-medium text-brand-600"
        >Buka daftar deal</RouterLink
      >
    </BaseCard>

    <p
      v-else-if="!isNew && quotationQuery.isPending.value"
      class="p-12 text-center text-sm text-gray-500"
    >
      Memuat data...
    </p>
    <div
      v-else-if="!isNew && (quotationQuery.isError.value || !quotation)"
      class="p-12 text-center"
    >
      <p class="font-semibold text-red-700">Quotation tidak ditemukan.</p>
    </div>

    <template v-else>
      <BaseCard class="space-y-3 !p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <FileText class="size-5 text-gray-400" />
              <h1 class="text-xl font-bold">
                {{ quotation?.quotation_number ?? 'Quotation baru' }}
              </h1>
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="statusMeta[status].cls"
                >{{ statusMeta[status].label }}</span
              >
            </div>
            <p v-if="deal" class="text-sm text-gray-600 dark:text-gray-400">
              Deal:
              <RouterLink :to="`${base}deals/${deal.id}`" class="font-medium text-brand-600">{{
                deal.title
              }}</RouterLink>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <template v-if="!readonly">
              <BaseButton v-if="editable" :disabled="busy" @click="save">
                {{
                  createMutation.isPending.value || updateMutation.isPending.value
                    ? 'Menyimpan...'
                    : 'Simpan draft'
                }}
              </BaseButton>
              <BaseButton variant="outline" :disabled="busy" @click="previewPdf">
                <Eye class="size-4" />
                Preview PDF
              </BaseButton>
              <BaseButton v-if="canSend" :disabled="busy" @click="openSend">
                <Send class="size-4" />
                Kirim…
              </BaseButton>
              <details v-if="canSend" class="relative">
                <summary
                  class="cursor-pointer list-none rounded-lg border px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  Lainnya
                </summary>
                <div
                  class="absolute right-0 z-10 mt-1 w-56 rounded-lg border bg-white p-1 shadow-lg dark:bg-gray-900"
                >
                  <button
                    type="button"
                    class="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    :disabled="busy"
                    @click="markSent"
                  >
                    Tandai terkirim (manual)
                  </button>
                </div>
              </details>
              <BaseButton
                v-if="!isNew && auth.can('quotation.delete')"
                variant="danger"
                :disabled="busy"
                aria-label="Hapus quotation"
                @click="remove"
              >
                <Trash2 class="size-4" />
              </BaseButton>
            </template>
            <template v-else>
              <BaseButton v-if="canSend" :disabled="busy" @click="openSend">
                <Send class="size-4" />
                Kirim…
              </BaseButton>
              <BaseButton variant="outline" :disabled="busy" @click="downloadPdf">
                <Download class="size-4" />
                Download PDF
              </BaseButton>
              <BaseButton
                v-if="
                  ['sent', 'rejected', 'expired'].includes(status) && auth.can('quotation.update')
                "
                :disabled="busy"
                @click="revise"
              >
                Buat revisi
              </BaseButton>
              <BaseButton
                v-if="status === 'sent' && auth.can('quotation.approve')"
                variant="outline"
                @click="decision = 'approve'"
              >
                Tandai disetujui
              </BaseButton>
              <BaseButton
                v-if="status === 'sent' && auth.can('quotation.reject')"
                variant="secondary"
                @click="decision = 'reject'"
              >
                Tandai ditolak
              </BaseButton>
            </template>
          </div>
        </div>

        <p
          v-if="readonly && status !== 'superseded'"
          class="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200"
        >
          <template v-if="quotation?.sent_at"
            >Terkirim {{ formatDate(quotation.sent_at) }} ·
          </template>
          Untuk mengubah, buat revisi.
        </p>
        <p
          v-if="status === 'superseded'"
          class="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Versi ini sudah digantikan revisi.
          <RouterLink
            v-if="dealId"
            :to="`${base}deals/${dealId}`"
            class="font-medium text-brand-600"
            >Lihat versi terbaru di deal</RouterLink
          >
        </p>
        <p
          v-if="lockedNotice"
          class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          role="status"
        >
          Quotation sudah terkirim. Buat revisi untuk mengubah.
        </p>
        <p
          v-if="legacyTaxNotice"
          class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          Pajak dihitung ulang per item; periksa kembali sebelum mengirim.
        </p>
        <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
      </BaseCard>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <BaseCard class="space-y-4 !p-5">
          <QuotationItemsTable
            v-model:lines="lines"
            :totals="totals"
            :readonly="!editable"
            @add-product="pickerOpen = true"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block space-y-1 text-sm">
              <span class="font-medium">Berlaku sampai</span>
              <input
                v-if="editable"
                v-model="validUntil"
                type="date"
                name="valid-until"
                class="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-brand-500 dark:bg-gray-950"
              />
              <span v-else class="block">{{ formatDate(quotation?.valid_until) }}</span>
            </label>
            <label class="block space-y-1 text-sm sm:col-span-2">
              <span class="font-medium">Catatan</span>
              <textarea
                v-if="editable"
                v-model="notes"
                name="notes"
                rows="3"
                class="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-brand-500 dark:bg-gray-950"
              />
              <span v-else class="block whitespace-pre-line">{{ quotation?.notes || '-' }}</span>
            </label>
          </div>
        </BaseCard>

        <BaseCard class="h-fit space-y-2 !p-5 text-sm">
          <h2 class="font-semibold">Ringkasan</h2>
          <dl class="space-y-1">
            <div class="flex justify-between">
              <dt class="text-gray-500">Subtotal</dt>
              <dd class="tabular-nums">{{ formatRupiah(totals.subtotal) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Diskon</dt>
              <dd class="tabular-nums">{{ formatRupiah(totals.discountTotal) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Pajak</dt>
              <dd class="tabular-nums">
                {{ formatRupiah(readonly ? (quotation?.tax_total ?? '0') : totals.taxTotal) }}
              </dd>
            </div>
            <div class="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd class="tabular-nums">
                {{ formatRupiah(readonly ? (quotation?.grand_total ?? '0') : totals.grandTotal) }}
              </dd>
            </div>
          </dl>
          <p v-if="!readonly" class="text-xs text-gray-500">
            Angka final dihitung server saat disimpan.
          </p>
          <div v-if="!isNew && quotation" class="border-t pt-3">
            <QuotationSendHistory :quotation-id="quotation.id" />
          </div>
        </BaseCard>
      </div>
    </template>

    <ProductPicker :open="pickerOpen" @close="pickerOpen = false" @pick="addProduct" />
    <SendQuotationDialog
      v-if="quotation"
      :open="sendOpen"
      :quotation="quotation"
      :contact="contact"
      :availability="availability"
      :mailboxes="activeMailboxes"
      :sessions="connectedSessions"
      @close="sendOpen = false"
    />
    <QuotationDecisionDialogs
      v-if="quotation"
      :quotation="quotation"
      :mode="decision"
      @close="decision = null"
      @revise="revise"
    />
  </div>
</template>
