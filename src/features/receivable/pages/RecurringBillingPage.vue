<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CalendarClock, MailWarning } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import type { SendChannel } from '@/features/receivable/api/receivable.api'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import SendInvoiceDialog from '@/features/receivable/components/SendInvoiceDialog.vue'
import { useInvoiceQuery, useOverviewQuery } from '@/features/receivable/api/receivable.queries'
import { invoiceChannelAvailability } from '@/features/receivable/utils/send-invoice'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const auth = useAuthStore()
// Prefix menu (tenant /app/billing atau platform) dari path saat ini; kontrak ada di /app/sales.
const base = computed(() => route.path.replace(/\/recurring\/?$/, ''))
const salesBase = computed(() => base.value.replace(/\/billing$/, '/sales'))

const query = useOverviewQuery()
const overview = computed(() => query.data.value)

const channelLabel: Record<SendChannel, string> = { email: 'Email', whatsapp: 'WhatsApp' }

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  )
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )

// Retry: invoice lengkap dimuat saat diklik, lalu dialog kirim yang sama dengan halaman detail dibuka.
const retry = ref<{ invoiceId: string; channel: SendChannel } | null>(null)
const retryInvoice = useInvoiceQuery(computed(() => retry.value?.invoiceId))
const availability = computed(() =>
  invoiceChannelAvailability({
    accountHasContact: Boolean(retryInvoice.data.value?.account.contact_id),
    canEmail: auth.can('email.send'),
    canWhatsApp: auth.can('whatsapp.message.send'),
  }),
)
const canRetry = computed(() => auth.can('invoice.send'))
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Recurring Billing"
      description="Pantau kontrak aktif, tagihan berikutnya, dan kiriman invoice yang gagal."
    />

    <p v-if="query.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </p>
    <p v-else-if="query.isError.value || !overview" class="p-12 text-center text-sm text-red-700">
      Gagal memuat data Recurring Billing.
    </p>
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BaseCard class="space-y-1 !p-5">
          <p class="text-sm text-gray-500">Kontrak aktif</p>
          <p class="text-2xl font-bold tabular-nums">{{ overview.active_contracts }}</p>
        </BaseCard>
        <BaseCard class="space-y-1 !p-5">
          <p class="text-sm text-gray-500">Nilai berulang</p>
          <p v-if="overview.recurring_by_frequency.length === 0" class="text-sm text-gray-500">
            Belum ada item berulang.
          </p>
          <ul v-else class="space-y-0.5 text-sm">
            <li
              v-for="r in overview.recurring_by_frequency"
              :key="r.frequency"
              class="flex justify-between gap-3"
            >
              <span>{{ r.label }}</span>
              <span class="font-semibold tabular-nums">{{ formatRupiah(r.amount) }}</span>
            </li>
          </ul>
        </BaseCard>
        <BaseCard class="space-y-1 !p-5">
          <p class="text-sm text-gray-500">Belum lunas</p>
          <p class="text-2xl font-bold tabular-nums">{{ overview.unpaid.count }} invoice</p>
          <p class="text-sm tabular-nums">Sisa {{ formatRupiah(overview.unpaid.total_balance) }}</p>
          <p
            v-if="overview.unpaid.overdue_count > 0"
            class="text-sm font-medium text-red-700"
            data-testid="overdue"
          >
            {{ overview.unpaid.overdue_count }} jatuh tempo
          </p>
        </BaseCard>
        <BaseCard class="space-y-1 !p-5">
          <p class="text-sm text-gray-500">Kiriman gagal</p>
          <p
            class="text-2xl font-bold tabular-nums"
            :class="overview.failed_sends.length > 0 ? 'text-red-700' : ''"
          >
            {{ overview.failed_sends.length }}
          </p>
        </BaseCard>
      </div>

      <BaseCard class="!p-0">
        <h2 class="border-b px-5 py-3 font-semibold">Tagihan 30 hari ke depan</h2>
        <div v-if="overview.upcoming.length === 0" class="p-10 text-center text-sm text-gray-500">
          <CalendarClock class="mx-auto mb-3 size-8 text-gray-300" />
          Tidak ada tagihan dalam 30 hari ke depan.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
              <tr>
                <th class="px-5 py-3">Tanggal tagih</th>
                <th class="px-5 py-3">Kontrak</th>
                <th class="px-5 py-3">Pelanggan</th>
                <th class="px-5 py-3">Periode</th>
                <th class="px-5 py-3">Waktu bayar</th>
                <th class="px-5 py-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in overview.upcoming"
                :key="`${u.contract_id}-${u.bill_on}-${u.period_start}-${u.amount}`"
                class="border-b last:border-0"
              >
                <td class="px-5 py-3">{{ formatDate(u.bill_on) }}</td>
                <td class="px-5 py-3">
                  <RouterLink
                    :to="`${salesBase}/contracts/${u.contract_id}`"
                    class="font-medium text-brand-600"
                    >{{ u.contract_number }}</RouterLink
                  >
                </td>
                <td class="px-5 py-3">{{ u.account_name }}</td>
                <td class="px-5 py-3">
                  {{ formatDate(u.period_start) }} – {{ formatDate(u.period_end) }}
                </td>
                <td class="px-5 py-3">
                  {{ u.payment_timing === 'postpaid' ? 'Pascabayar' : 'Prabayar' }}
                </td>
                <td class="px-5 py-3 text-right tabular-nums">{{ formatRupiah(u.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <BaseCard class="!p-0">
        <h2 class="border-b px-5 py-3 font-semibold">Kiriman gagal</h2>
        <div
          v-if="overview.failed_sends.length === 0"
          class="p-10 text-center text-sm text-gray-500"
        >
          <MailWarning class="mx-auto mb-3 size-8 text-gray-300" />
          Tidak ada kiriman gagal.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
              <tr>
                <th class="px-5 py-3">Invoice</th>
                <th class="px-5 py-3">Pelanggan</th>
                <th class="px-5 py-3">Kanal</th>
                <th class="px-5 py-3">Alasan</th>
                <th class="px-5 py-3">Waktu</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="f in overview.failed_sends"
                :key="`${f.invoice_id}-${f.channel}`"
                class="border-b last:border-0"
              >
                <td class="px-5 py-3">
                  <RouterLink
                    :to="`${base}/invoices/${f.invoice_id}`"
                    class="font-medium text-brand-600"
                    >{{ f.invoice_number || 'Invoice' }}</RouterLink
                  >
                </td>
                <td class="px-5 py-3">{{ f.account_name }}</td>
                <td class="px-5 py-3">{{ channelLabel[f.channel] }}</td>
                <td class="px-5 py-3 text-red-700">{{ f.error }}</td>
                <td class="px-5 py-3">{{ formatDateTime(f.sent_at) }}</td>
                <td class="px-5 py-3 text-right">
                  <BaseButton
                    v-if="canRetry"
                    variant="outline"
                    :data-retry="f.invoice_id"
                    @click="retry = { invoiceId: f.invoice_id, channel: f.channel }"
                    >Retry</BaseButton
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </template>

    <SendInvoiceDialog
      v-if="retry && retryInvoice.data.value"
      :open="true"
      :invoice="retryInvoice.data.value"
      :availability="availability"
      :initial-channel="retry.channel"
      @close="retry = null"
    />
  </div>
</template>
