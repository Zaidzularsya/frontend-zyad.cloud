<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import type { CatalogProduct } from '@/features/catalog/api/catalog.api'
import ProductPicker from '@/features/crm/quotations/components/ProductPicker.vue'
import QuotationItemsTable from '@/features/crm/quotations/components/QuotationItemsTable.vue'
import {
  computeTotals,
  formatRupiah,
  lineFromProduct,
} from '@/features/crm/quotations/utils/quotation-editor'
import type { SendChannel } from '@/features/receivable/api/receivable.api'
import {
  useCreateInvoiceMutation,
  useInvoiceQuery,
  useReceivableSettingsQuery,
  useSendersQuery,
  useUpdateInvoiceMutation,
} from '@/features/receivable/api/receivable.queries'
import AccountPicker from '@/features/receivable/components/AccountPicker.vue'
import { receivableErrorCode, receivableErrorMessage } from '@/features/receivable/utils/errors'
import {
  blankInvoiceForm,
  buildInvoicePayload,
  formFromInvoice,
  validateInvoiceForm,
  type InvoiceForm,
} from '@/features/receivable/utils/invoice-form'
import { isEditable } from '@/features/receivable/utils/invoice-status'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const routeId = computed(() => String(route.params.id ?? ''))
const isNew = computed(() => !route.params.id)
// Prefix menu (tenant /app/billing atau platform) diambil dari path saat ini.
const base = computed(() => route.path.replace(/\/invoices\/(new|[^/]+\/edit)$/, ''))
const productsPath = computed(() =>
  route.path.startsWith('/platform') ? '/platform/crm/products' : '/app/crm/products',
)

const invoiceQuery = useInvoiceQuery(computed(() => (isNew.value ? undefined : routeId.value)))
const settingsQuery = useReceivableSettingsQuery()
const canPickPic = computed(() => auth.can('receivable.settings') || auth.can('invoice.create'))
const sendersQuery = useSendersQuery(canPickPic)
const senders = computed(() => sendersQuery.data.value ?? [])

const createMutation = useCreateInvoiceMutation()
const updateMutation = useUpdateInvoiceMutation()

const form = ref<InvoiceForm>(blankInvoiceForm([]))
const savedSnapshot = ref('')
const hydrated = ref(false)
const errorMessage = ref('')
const pickerOpen = ref(false)

const invoice = computed(() => invoiceQuery.data.value)
const totals = computed(() => computeTotals(form.value.lines))
const snapshot = () => JSON.stringify(buildInvoicePayload(form.value))
const dirty = computed(() => hydrated.value && snapshot() !== savedSnapshot.value)
const locked = computed(() => Boolean(invoice.value) && !isEditable(invoice.value!.status))

// Isi form sekali: draft dari server (edit) atau default kanal dari pengaturan (baru).
watch(
  () => [isNew.value, invoice.value?.id, settingsQuery.data.value] as const,
  () => {
    if (hydrated.value) return
    if (isNew.value) {
      if (!settingsQuery.data.value && !settingsQuery.isError.value) return
      form.value = blankInvoiceForm(settingsQuery.data.value?.default_channels ?? [])
    } else {
      if (!invoice.value) return
      form.value = formFromInvoice(invoice.value)
    }
    savedSnapshot.value = snapshot()
    hydrated.value = true
  },
  { immediate: true },
)

function addProduct(product: CatalogProduct) {
  form.value = { ...form.value, lines: [...form.value.lines, lineFromProduct(product)] }
  pickerOpen.value = false
}

function toggleChannel(channel: SendChannel, on: boolean) {
  const next = new Set(form.value.channels)
  if (on) next.add(channel)
  else next.delete(channel)
  form.value = {
    ...form.value,
    channels: (['email', 'whatsapp'] as const).filter((c) => next.has(c)),
  }
}

const saving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

async function save() {
  errorMessage.value = ''
  const problem = validateInvoiceForm(form.value)
  if (problem) {
    errorMessage.value = problem
    return
  }
  try {
    const payload = buildInvoicePayload(form.value)
    const saved = isNew.value
      ? await createMutation.mutateAsync(payload)
      : await updateMutation.mutateAsync({ id: routeId.value, payload })
    savedSnapshot.value = snapshot()
    toast.success('Draft invoice disimpan.')
    await router.push(`${base.value}/invoices/${saved.id}`)
  } catch (error) {
    errorMessage.value =
      receivableErrorCode(error) === 'INVOICE_NOT_DRAFT'
        ? 'Invoice sudah diterbitkan di tab lain dan tidak bisa diubah.'
        : receivableErrorMessage(error, 'Draft gagal disimpan. Coba lagi.')
  }
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <div class="space-y-5">
    <RouterLink
      :to="`${base}/invoices`"
      class="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600"
    >
      <ArrowLeft class="size-4" /> Semua invoice
    </RouterLink>
    <h1 class="text-xl font-semibold">{{ isNew ? 'Invoice baru' : 'Edit draft invoice' }}</h1>

    <p v-if="!isNew && invoiceQuery.isPending.value" class="text-sm text-gray-500">Memuat...</p>
    <p v-else-if="!isNew && invoiceQuery.isError.value" class="text-sm text-red-600" role="alert">
      Invoice tidak ditemukan.
    </p>
    <p
      v-else-if="locked"
      class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
      role="alert"
    >
      Invoice ini sudah diterbitkan dan tidak bisa diubah.
      <RouterLink :to="`${base}/invoices/${routeId}`" class="font-medium underline"
        >Lihat invoice</RouterLink
      >
    </p>

    <form v-else-if="hydrated" class="space-y-5" @submit.prevent="save">
      <BaseCard>
        <h2 class="mb-3 text-sm font-semibold">Pelanggan</h2>
        <AccountPicker v-model:account-id="form.accountId" :initial="invoice?.account" />
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-sm font-semibold">Item</h2>
        <QuotationItemsTable
          :lines="form.lines"
          :totals="totals"
          :readonly="false"
          @update:lines="form = { ...form, lines: $event }"
          @add-product="pickerOpen = true"
        />
        <dl class="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <div class="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{{ formatRupiah(totals.subtotal) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt>Diskon</dt>
            <dd>{{ formatRupiah(totals.discountTotal) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt>Pajak</dt>
            <dd>{{ formatRupiah(totals.taxTotal) }}</dd>
          </div>
          <div class="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{{ formatRupiah(totals.grandTotal) }}</dd>
          </div>
          <div
            v-for="r in totals.recurring"
            :key="r.frequency"
            class="flex justify-between text-gray-600 dark:text-gray-300"
          >
            <dt>Berulang ({{ r.label }})</dt>
            <dd>{{ formatRupiah(r.amount) }}</dd>
          </div>
        </dl>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-sm font-semibold">Periode & pengiriman</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block space-y-1 text-sm">
            <span class="font-medium">Awal periode (opsional)</span>
            <input v-model="form.periodStart" type="date" name="period_start" :class="inputClass" />
          </label>
          <label class="block space-y-1 text-sm">
            <span class="font-medium">Akhir periode (opsional)</span>
            <input v-model="form.periodEnd" type="date" name="period_end" :class="inputClass" />
          </label>
          <p class="text-xs text-gray-500 sm:col-span-2">
            Periode berlaku untuk baris berulang. Jatuh tempo tidak akan lebih awal dari awal
            periode.
          </p>
          <fieldset class="space-y-2 text-sm">
            <legend class="font-medium">Kirim via</legend>
            <label
              v-for="c in ['email', 'whatsapp'] as const"
              :key="c"
              class="flex items-center gap-2"
            >
              <input
                type="checkbox"
                :name="`channel-${c}`"
                :checked="form.channels.includes(c)"
                @change="toggleChannel(c, ($event.target as HTMLInputElement).checked)"
              />
              {{ c === 'email' ? 'Email' : 'WhatsApp' }}
            </label>
            <p class="text-xs text-gray-500">
              WhatsApp hanya untuk pelanggan yang terhubung ke kontak CRM.
            </p>
          </fieldset>
          <label v-if="canPickPic" class="block space-y-1 text-sm">
            <span class="font-medium">PIC pengirim (opsional)</span>
            <select v-model="form.picUserId" name="pic" :class="inputClass">
              <option value="">Pakai pengirim default / yang menerbitkan</option>
              <option v-for="s in senders" :key="s.user_id" :value="s.user_id">{{ s.name }}</option>
            </select>
          </label>
        </div>
        <label class="mt-4 block space-y-1 text-sm">
          <span class="font-medium">Catatan (opsional)</span>
          <textarea v-model="form.notes" name="notes" rows="3" :class="inputClass" />
        </label>
      </BaseCard>

      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="router.push(`${base}/invoices`)">Batal</BaseButton>
        <BaseButton type="submit" :disabled="saving">{{
          saving ? 'Menyimpan...' : 'Simpan draft'
        }}</BaseButton>
      </div>
    </form>

    <ProductPicker
      :open="pickerOpen"
      :products-path="productsPath"
      @close="pickerOpen = false"
      @pick="addProduct"
    />
  </div>
</template>
