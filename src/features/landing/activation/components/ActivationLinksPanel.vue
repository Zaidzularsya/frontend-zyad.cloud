<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'

import { buildShareMessage, buildWhatsAppUrl } from '../utils/activation-share'

const props = defineProps<{
  buyerName: string
  buyerContact: string
  pageTitle: string
  /** Link preview baru; kosong bila panel hanya untuk link pembayaran. */
  previewUrl?: string
  paymentUrl?: string
}>()

const toast = useToast()

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} disalin.`)
  } catch {
    toast.error('Gagal menyalin. Salin manual dari kolom di atas.')
  }
}

// Membuka WhatsApp dengan nomor pelanggan dan pesan terisi; kirimnya tetap lewat tombol WhatsApp.
function shareWhatsApp(kind: 'all' | 'preview' | 'payment') {
  const message = buildShareMessage({
    buyerName: props.buyerName,
    pageTitle: props.pageTitle,
    previewUrl: kind === 'payment' ? undefined : props.previewUrl,
    paymentUrl: kind === 'preview' ? undefined : props.paymentUrl,
  })
  const url = buildWhatsAppUrl(props.buyerContact, message)
  if (!url) {
    toast.error('Nomor WhatsApp pelanggan tidak valid.')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <div class="space-y-4 text-sm">
    <label v-if="previewUrl" class="block space-y-1">
      <span class="font-medium">Link preview untuk pelanggan</span>
      <div class="flex gap-2">
        <input name="preview_url" readonly :value="previewUrl" :class="inputClass" />
        <BaseButton
          type="button"
          variant="outline"
          data-testid="copy-preview"
          @click="copy(previewUrl, 'Link preview')"
        >
          Salin
        </BaseButton>
        <BaseButton
          type="button"
          variant="outline"
          data-testid="share-whatsapp-preview"
          @click="shareWhatsApp('preview')"
        >
          WhatsApp
        </BaseButton>
      </div>
      <span class="block text-xs text-amber-700 dark:text-amber-300">
        Link preview hanya ditampilkan sekali. Salin atau kirim sekarang; setelah dialog ditutup
        link ini tidak bisa dilihat lagi (gunakan "Perbarui link" untuk membuat yang baru).
      </span>
    </label>
    <label v-if="paymentUrl" class="block space-y-1">
      <span class="font-medium">Link pembayaran</span>
      <div class="flex gap-2">
        <input name="payment_url" readonly :value="paymentUrl" :class="inputClass" />
        <BaseButton
          type="button"
          variant="outline"
          data-testid="copy-payment"
          @click="copy(paymentUrl, 'Link pembayaran')"
        >
          Salin
        </BaseButton>
        <BaseButton
          type="button"
          variant="outline"
          data-testid="share-whatsapp-payment"
          @click="shareWhatsApp('payment')"
        >
          WhatsApp
        </BaseButton>
      </div>
    </label>
    <div class="flex justify-end">
      <BaseButton type="button" data-testid="share-whatsapp-all" @click="shareWhatsApp('all')">
        Kirim ke WhatsApp pelanggan
      </BaseButton>
    </div>
  </div>
</template>
