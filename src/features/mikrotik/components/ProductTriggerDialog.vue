<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useSetTriggerMutation,
  useTriggerPreviewQuery,
} from '@/features/mikrotik/api/mikrotik.queries'
import { routerActionError } from '@/features/mikrotik/utils/errors'

const props = defineProps<{
  open: boolean
  product: { id: string; name: string } | null
}>()

const emit = defineEmits<{ (e: 'close'): void; (e: 'saved', enabled: boolean): void }>()

// Preview hanya diminta saat dialog terbuka.
const previewId = computed(() => (props.open ? props.product?.id : undefined))
const previewQuery = useTriggerPreviewQuery(previewId)
const preview = computed(() => previewQuery.data.value)
const alreadyEnabled = computed(() => preview.value?.already_enabled ?? false)

const mutation = useSetTriggerMutation()
const error = ref('')
watch(
  () => props.open,
  () => (error.value = ''),
)

function formatDate(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? ymd
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function submit() {
  if (!props.product || !preview.value) return
  const enabled = !alreadyEnabled.value
  error.value = ''
  try {
    await mutation.mutateAsync({ productId: props.product.id, enabled })
    emit('saved', enabled)
  } catch (e) {
    error.value = routerActionError(e)
  }
}
</script>

<template>
  <BaseModal :open="open" :title="`Memicu isolir: ${product?.name ?? ''}`" @close="emit('close')">
    <p v-if="previewQuery.isPending.value" class="text-sm text-gray-500">Memuat pratinjau...</p>
    <p v-else-if="previewQuery.isError.value" class="text-sm text-red-600" role="alert">
      Gagal memuat pratinjau. Tutup dan coba lagi.
    </p>
    <div v-else-if="preview" class="space-y-4 text-sm">
      <template v-if="!alreadyEnabled">
        <p>
          Bila diaktifkan, invoice overdue produk ini akan memicu isolir PPPoE pelanggan. Dampak
          langsung saat ini:
        </p>
        <ul class="list-disc space-y-1 pl-5">
          <li>
            <strong class="tabular-nums">{{ preview.active_contracts }}</strong> contract aktif
          </li>
          <li>
            <strong class="tabular-nums">{{ preview.accounts }}</strong> pelanggan
          </li>
          <li>
            <strong class="tabular-nums">{{ preview.overdue_invoices }}</strong> invoice overdue
            yang langsung memicu isolir
          </li>
        </ul>
        <p>
          Berlaku mulai <strong>{{ formatDate(preview.effective_from) }}</strong
          >.
        </p>
      </template>
      <template v-else>
        <p>Produk ini sudah memicu isolir sejak {{ formatDate(preview.effective_from) }}.</p>
        <p class="rounded-lg bg-amber-100 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Bila dinonaktifkan, pelanggan yang saat ini terisolir hanya karena produk ini akan dibuka
          otomatis.
        </p>
      </template>
      <p v-if="error" class="text-red-600" role="alert">{{ error }}</p>
    </div>

    <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <BaseButton variant="outline" :disabled="mutation.isPending.value" @click="emit('close')">
        Batal
      </BaseButton>
      <BaseButton
        :variant="alreadyEnabled ? 'danger' : 'primary'"
        :disabled="!preview || mutation.isPending.value"
        @click="submit"
      >
        {{
          mutation.isPending.value ? 'Memproses...' : alreadyEnabled ? 'Nonaktifkan' : 'Aktifkan'
        }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
