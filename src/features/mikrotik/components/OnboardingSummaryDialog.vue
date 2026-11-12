<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { OnboardContactRef, OnboardPlan } from '@/features/mikrotik/types'

defineProps<{ open: boolean; plan: OnboardPlan | null; loading: boolean }>()
const emit = defineEmits<{
  (e: 'run'): void
  (e: 'use-existing', contact: OnboardContactRef): void
  (e: 'close'): void
}>()

const CHANNEL_LABEL: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp' }

function formatDate(value: string): string {
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime())
    ? value
    : `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)} (${value})`
}
function formatPrice(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? `Rp${n.toLocaleString('id-ID')}` : value
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Ringkasan onboarding"
    width-class="max-w-xl"
    @close="emit('close')"
  >
    <div v-if="plan" class="space-y-4 text-sm">
      <div
        v-if="plan.duplicate_of"
        class="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
        role="alert"
      >
        <p class="font-medium">Email atau nomor WhatsApp ini sudah dipakai kontak lain:</p>
        <p>
          {{ plan.duplicate_of.name }}
          <span class="text-xs">{{
            [plan.duplicate_of.email, plan.duplicate_of.phone].filter(Boolean).join(' · ')
          }}</span>
        </p>
        <p class="text-xs">Kontak ganda tidak bisa dibuat. Pakai kontak itu untuk secret ini.</p>
        <BaseButton
          data-testid="use-existing-contact"
          :disabled="loading"
          @click="emit('use-existing', plan.duplicate_of)"
        >
          Pakai kontak ini
        </BaseButton>
      </div>

      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt class="text-gray-500">Secret</dt>
        <dd class="font-medium">{{ plan.secret_name }}</dd>
        <dt class="text-gray-500">Kontak</dt>
        <dd>
          {{ plan.contact.name }}
          <span class="text-xs text-gray-500">{{
            plan.contact_action === 'new' ? '(kontak baru)' : '(kontak yang sudah ada)'
          }}</span>
        </dd>
        <dt class="text-gray-500">Deal</dt>
        <dd>
          {{ plan.deal_title }} <span class="text-xs text-gray-500">(sumber Impor PPPoE)</span>
        </dd>
        <dt class="text-gray-500">Produk</dt>
        <dd>{{ plan.quantity }} × {{ plan.product_name }} @ {{ formatPrice(plan.unit_price) }}</dd>
        <dt class="text-gray-500">Kontrak mulai</dt>
        <dd>{{ formatDate(plan.contract_start_date) }}</dd>
        <dt class="text-gray-500">Invoice awal</dt>
        <dd>
          {{
            plan.initial_invoice
              ? 'Dibuat sekarang saat sales order dikonfirmasi'
              : 'Tidak dibuat; invoice siklus berjalan terbit oleh penagihan otomatis bila waktunya belum lewat'
          }}
        </dd>
        <dt class="text-gray-500">Kirim invoice lewat</dt>
        <dd>{{ plan.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(', ') || '-' }}</dd>
      </dl>
      <p class="text-xs text-gray-500">
        Sistem membuat kontak (bila baru), deal, penawaran yang langsung disetujui, sales order, dan
        kontrak, lalu memasangkan secret ke pelanggan.
      </p>
    </div>
    <div class="mt-5 flex justify-end gap-2">
      <BaseButton variant="outline" :disabled="loading" @click="emit('close')">Batal</BaseButton>
      <BaseButton
        v-if="plan && !plan.duplicate_of"
        data-testid="onboard-run"
        :disabled="loading"
        @click="emit('run')"
      >
        {{ loading ? 'Memproses…' : 'Jalankan onboarding' }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
