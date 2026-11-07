<script setup lang="ts">
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  publicInvoiceApi,
  type ProvisioningContact,
  type ProvisioningStage,
} from '../api/public-invoice.api'
import { telHref, whatsappUrl } from '../utils/contact-links'

const props = defineProps<{ token: string }>()

// Rate limit endpoint publik dipakai bersama (30/menit/IP): jangan lebih rapat dari 5 detik.
const POLL_INTERVAL_MS = 5000
const POLL_MAX_ATTEMPTS = 60

const TEXT: Record<ProvisioningStage, string> = {
  received: 'Pembayaran diterima. Kami sedang menyiapkan pengaktifan internet Anda.',
  restoring: 'Sedang mengaktifkan internet. Biasanya 1–2 menit.',
  active: 'Internet Anda sudah aktif.',
  needs_help:
    'Pembayaran sudah kami terima, tetapi aktivasi tertunda. Hubungi kami agar segera dibantu.',
  other_invoices: 'Pembayaran diterima. Internet aktif setelah semua tagihan yang menunggak lunas.',
}
const IN_PROGRESS: ProvisioningStage[] = ['received', 'restoring']

// null = belum ada jawaban / tidak berlaku / error: blok disembunyikan.
const stage = ref<ProvisioningStage | null>(null)
const contact = ref<ProvisioningContact | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let attempts = 0
let stopped = false

async function poll() {
  attempts += 1
  try {
    const res = await publicInvoiceApi.provisioning(props.token)
    if (stopped) return
    if (!res.applicable || !res.stage) {
      stage.value = null
      contact.value = null
      return
    }
    stage.value = res.stage
    contact.value = res.stage === 'needs_help' ? (res.contact ?? null) : null
    if (!IN_PROGRESS.includes(res.stage)) return
  } catch {
    // Termasuk 404/429: jangan tampilkan status yang belum pasti.
    if (!stopped) {
      stage.value = null
      contact.value = null
    }
    return
  }
  if (attempts >= POLL_MAX_ATTEMPTS) return
  timer = setTimeout(() => void poll(), POLL_INTERVAL_MS)
}

onMounted(() => void poll())
onBeforeUnmount(() => {
  stopped = true
  clearTimeout(timer)
})

const inProgress = computed(() => stage.value !== null && IN_PROGRESS.includes(stage.value))
const tone = computed(() =>
  stage.value === 'needs_help'
    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
    : 'border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200',
)

const contactLinkClass = 'font-semibold underline underline-offset-2'

function reload() {
  window.location.reload()
}
</script>

<template>
  <!-- Wrapper selalu ada agar pembaca layar mengumumkan perubahan isi (live region harus ada sebelum isinya). -->
  <div data-testid="provisioning-region" role="status">
    <div
      v-if="stage"
      data-testid="provisioning-status"
      class="mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm"
      :class="tone"
    >
      <Loader2 v-if="inProgress" class="mt-0.5 size-5 shrink-0 animate-spin" aria-hidden="true" />
      <TriangleAlert
        v-else-if="stage === 'needs_help'"
        class="mt-0.5 size-5 shrink-0"
        aria-hidden="true"
      />
      <CheckCircle2 v-else class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p>{{ TEXT[stage] }}</p>
        <div v-if="stage === 'needs_help' && contact" class="mt-3 grid gap-1.5">
          <p v-if="contact.name" class="font-medium">{{ contact.name }}</p>
          <a v-if="contact.phone" :href="telHref(contact.phone)" :class="contactLinkClass">
            {{ contact.phone }}
          </a>
          <a
            v-if="contact.phone && whatsappUrl(contact.phone)"
            :href="whatsappUrl(contact.phone)"
            target="_blank"
            rel="noopener noreferrer"
            :class="contactLinkClass"
          >
            WhatsApp
          </a>
          <a v-if="contact.email" :href="`mailto:${contact.email}`" :class="contactLinkClass">
            {{ contact.email }}
          </a>
        </div>
        <button
          v-if="stage === 'active'"
          type="button"
          class="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none"
          @click="reload"
        >
          Muat ulang
        </button>
      </div>
    </div>
  </div>
</template>
