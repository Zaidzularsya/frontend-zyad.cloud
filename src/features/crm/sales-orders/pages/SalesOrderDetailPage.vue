<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AlertTriangle, ArrowLeft } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { pricingShort } from '@/features/catalog/utils/pricing'
import type {
  OrderChannel,
  SalesOrderDraftForm,
} from '@/features/crm/sales-orders/api/sales-orders.api'
import {
  useCancelSalesOrderMutation,
  useConfirmSalesOrderMutation,
  useRetryBillingMutation,
  useSalesOrderQuery,
  useUpdateSalesOrderMutation,
} from '@/features/crm/sales-orders/api/sales-orders.queries'
import DeliveryDialog from '@/features/crm/sales-orders/components/DeliveryDialog.vue'
import { salesOrderErrorMessages } from '@/features/crm/sales-orders/utils/errors'
import {
  BILLING_STATUS,
  SO_STATUS,
  TONE_CLASS,
  canEditDraft,
  canRetryBilling,
  groupSalesOrderItems,
  pendingDeliveryItems,
  soDraftFormFrom,
  validateSalesOrderDraft,
} from '@/features/crm/sales-orders/utils/sales-order'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import { FREQUENCIES } from '@/features/catalog/utils/pricing'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
// Prefix tenant (/app) atau platform (/platform) diambil dari path saat ini.
const base = computed(() => route.path.replace(/\/sales\/orders.*$/, ''))
const id = computed(() => String(route.params.id ?? ''))

const query = useSalesOrderQuery(id)
const so = computed(() => query.data.value)

const form = ref<SalesOrderDraftForm | null>(null)
const messages = ref<string[]>([])
watch(
  so,
  (value) => {
    if (value && (!form.value || canEditDraft(value.status))) form.value = soDraftFormFrom(value)
  },
  { immediate: true },
)

const update = useUpdateSalesOrderMutation()
const confirmMutation = useConfirmSalesOrderMutation()
const retry = useRetryBillingMutation()
const cancel = useCancelSalesOrderMutation()

const draft = computed(() => (so.value ? canEditDraft(so.value.status) : false))
const groups = computed(() => groupSalesOrderItems(so.value?.items ?? []))
const pending = computed(() => pendingDeliveryItems(so.value?.items ?? []))
const selected = ref<string[]>([])
const selectedItems = computed(() => pending.value.filter((i) => selected.value.includes(i.id)))
const deliveryOpen = ref(false)

function closeDelivery() {
  deliveryOpen.value = false
  selected.value = []
}

function toggleChannel(channel: OrderChannel) {
  if (!form.value) return
  const has = form.value.channels.includes(channel)
  form.value.channels = has
    ? form.value.channels.filter((c) => c !== channel)
    : [...form.value.channels, channel]
}

async function run(action: () => Promise<unknown>) {
  messages.value = []
  try {
    await action()
    return true
  } catch (error) {
    messages.value = salesOrderErrorMessages(error)
    return false
  }
}

async function save() {
  if (!so.value || !form.value) return false
  return run(() => update.mutateAsync({ id: so.value!.id, form: form.value! }))
}

async function confirmOrder() {
  if (!so.value || !form.value) return
  const problems = validateSalesOrderDraft(form.value, Boolean(so.value.contact_id))
  if (problems.length) {
    messages.value = problems
    return
  }
  if (!(await save())) return
  await run(() => confirmMutation.mutateAsync(so.value!.id))
}

async function cancelOrder() {
  if (!so.value || !confirm(`Batalkan sales order ${so.value.so_number}?`)) return
  await run(() => cancel.mutateAsync(so.value!.id))
}

const retryBilling = () => so.value && run(() => retry.mutateAsync(so.value!.id))

const frequencyLabel = (value: string) => FREQUENCIES.find((f) => f.value === value)?.label ?? value
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(`${value.slice(0, 10)}T00:00:00`),
      )
    : '-'
const inputClass = 'w-full rounded-lg border bg-white px-3 py-2 dark:bg-gray-950'
</script>

<template>
  <div>
    <p v-if="query.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </p>
    <div v-else-if="query.isError.value || !so" class="p-12 text-center">
      <p class="font-semibold text-red-700">Sales order tidak ditemukan.</p>
      <button
        class="mt-2 text-sm font-medium text-brand-600"
        @click="router.push(`${base}/sales/orders`)"
      >
        Kembali ke daftar
      </button>
    </div>

    <div v-else class="space-y-4">
      <BaseCard class="space-y-3 !p-5">
        <button
          class="inline-flex items-center gap-2 text-sm text-gray-600"
          @click="router.push(`${base}/sales/orders`)"
        >
          <ArrowLeft class="size-4" /> Kembali ke sales orders
        </button>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <h1 class="text-xl font-bold">{{ so.so_number }}</h1>
            <p class="text-xs text-gray-500">
              Dari penawaran
              <RouterLink
                :to="`${base}/crm/quotations/${so.quotation_id}`"
                class="text-brand-600"
                >{{ so.quotation_number }}</RouterLink
              >
              <template v-if="so.deal_id">
                ·
                <RouterLink :to="`${base}/crm/deals/${so.deal_id}`" class="text-brand-600"
                  >Buka deal</RouterLink
                >
              </template>
            </p>
            <div class="flex flex-wrap gap-2 text-xs">
              <span
                class="rounded-full px-2 py-0.5 font-medium"
                :class="TONE_CLASS[SO_STATUS[so.status].tone]"
                >{{ SO_STATUS[so.status].label }}</span
              >
              <span
                v-if="so.status !== 'draft' && so.status !== 'cancelled'"
                class="rounded-full px-2 py-0.5 font-medium"
                :class="TONE_CLASS[BILLING_STATUS[so.billing_status].tone]"
                >{{ BILLING_STATUS[so.billing_status].label }}</span
              >
            </div>
          </div>
          <div v-if="draft" class="flex gap-2">
            <BaseButton
              v-if="auth.can('sales_order.manage')"
              variant="secondary"
              @click="cancelOrder"
            >
              Batalkan
            </BaseButton>
            <BaseButton
              v-if="auth.can('sales_order.confirm')"
              :disabled="confirmMutation.isPending.value"
              @click="confirmOrder"
            >
              Konfirmasi SO
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <div
        v-if="so.billing_status === 'failed' && so.status !== 'draft'"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        <p class="flex items-center gap-2">
          <AlertTriangle class="size-4" /> {{ so.billing_error || 'Penagihan gagal dibuat.' }}
        </p>
        <BaseButton
          v-if="canRetryBilling(so.status, so.billing_status) && auth.can('sales_order.confirm')"
          variant="danger"
          :disabled="retry.isPending.value"
          @click="retryBilling"
        >
          Coba lagi penagihan
        </BaseButton>
      </div>

      <ul
        v-if="messages.length"
        class="space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        role="alert"
      >
        <li v-for="m in messages" :key="m">{{ m }}</li>
      </ul>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-4">
          <BaseCard class="space-y-3 !p-5">
            <h2 class="font-semibold">Item order</h2>
            <section v-for="group in groups" :key="group.title" class="space-y-2">
              <h3 class="text-xs font-semibold uppercase text-gray-500">{{ group.title }}</h3>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[520px] text-left text-sm">
                  <tbody>
                    <tr v-for="item in group.items" :key="item.id" class="border-b last:border-0">
                      <td v-if="so.status !== 'draft' && pending.length" class="w-8 py-2">
                        <input
                          v-if="
                            item.delivery_status === 'pending' && auth.can('sales_order.confirm')
                          "
                          v-model="selected"
                          type="checkbox"
                          :value="item.id"
                          :aria-label="`Pilih ${item.description}`"
                        />
                      </td>
                      <td class="py-2">
                        <p class="font-medium">{{ item.description }}</p>
                        <p class="text-xs text-gray-500">
                          {{ item.quantity }} × {{ formatRupiah(item.unit_price) }} ·
                          {{
                            pricingShort({
                              charge_type: item.charge_type,
                              billing_frequency: item.billing_frequency,
                              payment_timing: item.payment_timing,
                            })
                          }}
                        </p>
                      </td>
                      <td class="py-2 text-xs">
                        <span v-if="item.delivery_status === 'pending'" class="text-amber-700"
                          >Menunggu diterima</span
                        >
                        <span
                          v-else-if="item.delivery_status === 'delivered'"
                          class="text-green-700"
                        >
                          Diterima {{ formatDate(item.delivered_at) }}
                        </span>
                      </td>
                      <td class="py-2 text-right font-medium">
                        {{ formatRupiah(item.line_total) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            <div v-if="selectedItems.length" class="flex justify-end">
              <BaseButton @click="deliveryOpen = true"
                >Konfirmasi diterima ({{ selectedItems.length }})</BaseButton
              >
            </div>
          </BaseCard>

          <BaseCard v-if="form" class="space-y-3 !p-5">
            <h2 class="font-semibold">Penagihan</h2>
            <form class="grid gap-3 text-sm sm:grid-cols-2" @submit.prevent="save">
              <label class="space-y-1">
                <span class="font-medium">Tanggal mulai</span>
                <input
                  v-model="form.start_date"
                  type="date"
                  name="start_date"
                  :disabled="!draft"
                  :class="inputClass"
                />
              </label>
              <label class="space-y-1">
                <span class="font-medium">Nama penagihan</span>
                <input
                  v-model="form.bill_to_name"
                  name="bill_to_name"
                  :disabled="!draft"
                  :class="inputClass"
                />
              </label>
              <label class="space-y-1">
                <span class="font-medium">Perusahaan</span>
                <input
                  v-model="form.bill_to_company"
                  name="bill_to_company"
                  :disabled="!draft"
                  :class="inputClass"
                />
              </label>
              <label class="space-y-1">
                <span class="font-medium">Email</span>
                <input
                  v-model="form.bill_to_email"
                  type="email"
                  name="bill_to_email"
                  :disabled="!draft"
                  :class="inputClass"
                />
              </label>
              <label class="space-y-1">
                <span class="font-medium">Telepon</span>
                <input
                  v-model="form.bill_to_phone"
                  name="bill_to_phone"
                  :disabled="!draft"
                  :class="inputClass"
                />
              </label>
              <label class="space-y-1 sm:col-span-2">
                <span class="font-medium">Alamat</span>
                <textarea
                  v-model="form.bill_to_address"
                  name="bill_to_address"
                  rows="2"
                  :disabled="!draft"
                  :class="inputClass"
                />
              </label>
              <fieldset class="space-y-1 sm:col-span-2">
                <legend class="font-medium">Kanal pengiriman invoice</legend>
                <label class="mr-4 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="form.channels.includes('email')"
                    :disabled="!draft"
                    @change="toggleChannel('email')"
                  />
                  Email
                </label>
                <label class="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="form.channels.includes('whatsapp')"
                    :disabled="!draft || !so.contact_id"
                    @change="toggleChannel('whatsapp')"
                  />
                  WhatsApp
                  <span v-if="!so.contact_id" class="text-xs text-gray-500"
                    >(butuh kontak CRM)</span
                  >
                </label>
              </fieldset>
              <div v-if="draft && auth.can('sales_order.manage')" class="sm:col-span-2">
                <BaseButton type="submit" variant="secondary" :disabled="update.isPending.value"
                  >Simpan draft</BaseButton
                >
              </div>
            </form>
          </BaseCard>
        </div>

        <BaseCard class="space-y-3 !p-5 text-sm">
          <h2 class="font-semibold">Ringkasan</h2>
          <dl class="space-y-1">
            <div class="flex justify-between">
              <dt class="text-gray-500">Subtotal</dt>
              <dd>{{ formatRupiah(so.subtotal) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Pajak</dt>
              <dd>{{ formatRupiah(so.tax_total) }}</dd>
            </div>
            <div class="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{{ formatRupiah(so.grand_total) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Tagihan pertama</dt>
              <dd>{{ formatRupiah(so.first_invoice_total) }}</dd>
            </div>
            <div
              v-for="(value, freq) in so.recurring_totals"
              :key="freq"
              class="flex justify-between"
            >
              <dt class="text-gray-500">
                Berulang {{ frequencyLabel(String(freq)).toLowerCase() }}
              </dt>
              <dd>{{ formatRupiah(value) }}</dd>
            </div>
          </dl>
          <div class="space-y-1 border-t pt-3">
            <p v-if="so.initial_invoice">
              Invoice awal:
              <RouterLink
                :to="`${base}/billing/invoices/${so.initial_invoice.id}`"
                class="text-brand-600"
                >{{ so.initial_invoice.number || 'Lihat' }}</RouterLink
              >
              <span class="text-xs text-gray-500"> ({{ so.initial_invoice.status }})</span>
            </p>
            <p v-if="so.contract">
              Kontrak:
              <RouterLink
                :to="`${base}/sales/contracts/${so.contract.id}`"
                class="text-brand-600"
                >{{ so.contract.number || 'Lihat' }}</RouterLink
              >
            </p>
            <p v-if="!so.initial_invoice && !so.contract" class="text-gray-500">
              Belum ada invoice atau kontrak.
            </p>
          </div>
        </BaseCard>
      </div>

      <DeliveryDialog
        :open="deliveryOpen"
        :sales-order-id="so.id"
        :items="selectedItems"
        @close="closeDelivery"
      />
    </div>
  </div>
</template>
