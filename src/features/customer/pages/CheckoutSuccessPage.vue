<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { billingApi, type BillingInvoice } from '@/features/billing/api/billing.api'

type CheckoutOutcome = 'pending' | 'paid' | 'failed' | 'unknown'

const route = useRoute()
const invoiceId = computed(() =>
  typeof route.query.invoice === 'string' ? route.query.invoice.trim() : '',
)
const isSimulated = computed(() => route.query.simulated === 'true')

const outcome = ref<CheckoutOutcome>('pending')
const invoice = ref<BillingInvoice | null>(null)
const activePlanName = ref('')
const pollCount = ref(0)

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 20

let pollTimer: ReturnType<typeof setTimeout> | null = null
let disposed = false

async function findInvoice(): Promise<BillingInvoice | null> {
  if (!invoiceId.value) return null
  const response = await billingApi.invoices({ page: 1, per_page: 50 })
  return response.data.find((item) => item.id === invoiceId.value) ?? null
}

async function checkPaymentStatus() {
  if (disposed) return
  pollCount.value += 1
  try {
    // Rekonsiliasi aktif: backend menanyakan status transaksi langsung ke
    // DOKU (Check Status API), jadi invoice tetap ter-settle meskipun
    // webhook notification DOKU tidak pernah sampai.
    const status = await billingApi.syncInvoiceCheckoutStatus(invoiceId.value)
    if (status.paid) {
      outcome.value = 'paid'
      invoice.value = await findInvoice().catch(() => null)
      try {
        const currentPlan = await billingApi.currentPlan()
        activePlanName.value = currentPlan.subscription?.plan?.name ?? ''
      } catch {
        activePlanName.value = ''
      }
      return
    }
    if (['expired', 'failed', 'void'].includes(status.invoice_status)) {
      invoice.value = await findInvoice().catch(() => null)
      outcome.value = 'failed'
      return
    }
    if (['EXPIRED', 'FAILED'].includes(status.transaction_status ?? '')) {
      invoice.value = await findInvoice().catch(() => null)
      outcome.value = 'failed'
      return
    }
  } catch {
    // Kegagalan sementara — biarkan polling berikutnya mencoba lagi.
    if (!invoiceId.value && pollCount.value >= 3) {
      outcome.value = 'unknown'
      return
    }
  }
  if (pollCount.value >= MAX_POLLS) {
    outcome.value = 'unknown'
    return
  }
  pollTimer = setTimeout(() => void checkPaymentStatus(), POLL_INTERVAL_MS)
}

onMounted(() => {
  void checkPaymentStatus()
})

onUnmounted(() => {
  disposed = true
  if (pollTimer) clearTimeout(pollTimer)
})
</script>

<template>
  <div class="mx-auto max-w-xl py-8">
    <BaseCard class="text-center">
      <template v-if="outcome === 'pending'">
        <span
          class="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950"
        >
          <Loader2 class="size-7 animate-spin" />
        </span>
        <h1 class="mt-5 text-2xl font-semibold">Menunggu konfirmasi pembayaran</h1>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Kami sedang memverifikasi pembayaran Anda dengan DOKU. Halaman ini akan diperbarui
          otomatis — biasanya kurang dari satu menit.
        </p>
      </template>

      <template v-else-if="outcome === 'paid'">
        <span
          class="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950"
        >
          <CheckCircle2 class="size-7" />
        </span>
        <h1 class="mt-5 text-2xl font-semibold">Pembayaran berhasil!</h1>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Invoice Anda telah lunas<template v-if="activePlanName">
            dan paket
            <strong class="text-gray-900 dark:text-gray-100">{{ activePlanName }}</strong> kini
            aktif</template
          >. Terima kasih telah berlangganan Zyad Cloud.
        </p>
        <p
          v-if="isSimulated"
          class="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-xs text-sky-700"
        >
          Mode simulasi aktif (kredensial DOKU belum dikonfigurasi) — pembayaran tidak benar-benar
          diproses. Selesaikan konfigurasi DOKU untuk transaksi nyata.
        </p>
      </template>

      <template v-else-if="outcome === 'failed'">
        <span
          class="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950"
        >
          <CircleAlert class="size-7" />
        </span>
        <h1 class="mt-5 text-2xl font-semibold">Pembayaran tidak selesai</h1>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Invoice berstatus <strong>{{ invoice?.status }}</strong
          >. Sesi pembayaran mungkin dibatalkan atau kedaluwarsa. Anda dapat mencoba lagi dari
          halaman Billing.
        </p>
      </template>

      <template v-else>
        <span
          class="mx-auto grid size-14 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950"
        >
          <CircleAlert class="size-7" />
        </span>
        <h1 class="mt-5 text-2xl font-semibold">Status pembayaran belum terkonfirmasi</h1>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Konfirmasi dari payment gateway belum kami terima. Jika Anda sudah membayar, status akan
          diperbarui otomatis beberapa saat lagi — periksa halaman Billing secara berkala.
        </p>
      </template>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <RouterLink to="/app/billing">
          <BaseButton variant="outline">Lihat Billing</BaseButton>
        </RouterLink>
        <RouterLink to="/app/dashboard">
          <BaseButton>Ke Dashboard</BaseButton>
        </RouterLink>
      </div>
    </BaseCard>
  </div>
</template>
