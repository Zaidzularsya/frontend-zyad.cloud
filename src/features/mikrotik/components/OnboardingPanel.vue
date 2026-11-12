<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import { catalogApi } from '@/features/catalog/api/catalog.api'
import {
  useOnboardPreviewMutation,
  useOnboardRunMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import ContactPicker from '@/features/mikrotik/components/ContactPicker.vue'
import OnboardingSummaryDialog from '@/features/mikrotik/components/OnboardingSummaryDialog.vue'
import type {
  OnboardContactRef,
  OnboardPayload,
  OnboardPlan,
  OnboardStage,
  SecretDetail,
} from '@/features/mikrotik/types'
import { secretActionError } from '@/features/mikrotik/utils/errors'
import { useReceivableSettingsQuery } from '@/features/receivable/api/receivable.queries'

const props = defineProps<{ detail: SecretDetail }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const toast = useToast()
const secret = computed(() => props.detail.secret)
const onboarding = computed(() => props.detail.onboarding)
// Pelanggan sudah ditentukan: secret terpasang (pakai kontak akunnya) atau kontak sudah dibuat.
const customerFixed = computed(
  () => Boolean(secret.value.account_id) || Boolean(onboarding.value?.contact_id),
)
const inProgress = computed(() => onboarding.value !== null && onboarding.value.stage !== 'paired')

// --- katalog: hanya produk aktif yang ditagih berulang (kontrak hanya lahir dari baris berulang) ---
const products = useQuery({
  queryKey: ['mikrotik', 'onboard-products'],
  queryFn: () => catalogApi.products({ page: 1, per_page: 100, is_active: true }),
})
const recurringProducts = computed(() =>
  (products.data.value?.data ?? []).filter((p) => p.charge_type === 'recurring' && p.is_active),
)
const catalogEmpty = computed(
  () => products.isSuccess.value && recurringProducts.value.length === 0,
)

// --- isian ---
const customerMode = ref<'existing' | 'new'>('new')
const existingContact = ref<OnboardContactRef | null>(null)
const newName = ref(secret.value.name)
const newPhone = ref(secret.value.suggestion?.account_phone ?? '')
const newEmail = ref('')
const productId = ref('')
const quantity = ref('1')
const unitPrice = ref('')
const createInitialInvoice = ref(false)

watch(productId, (id) => {
  const p = recurringProducts.value.find((x) => x.id === id)
  if (p) unitPrice.value = p.base_price
})

// Tanggal tagih: default tenant bila diatur, selain itu tanggal hari ini; bisa diubah.
const settings = useReceivableSettingsQuery()
const billingDay = ref(String(new Date().getDate()))
const billingDayTouched = ref(false)
watch(
  () => settings.data.value?.default_billing_day,
  (day) => {
    if (!billingDayTouched.value && day) billingDay.value = String(day)
  },
  { immediate: true },
)

const billingDayNumber = computed(() => Number(billingDay.value))
const billingDayValid = computed(
  () =>
    Number.isInteger(billingDayNumber.value) &&
    billingDayNumber.value >= 1 &&
    billingDayNumber.value <= 31,
)
const customerReady = computed(() => {
  if (customerFixed.value) return true
  if (customerMode.value === 'existing') return existingContact.value !== null
  return newName.value.trim().length >= 2 && Boolean(newEmail.value.trim() || newPhone.value.trim())
})
const formReady = computed(
  () => Boolean(productId.value) && billingDayValid.value && customerReady.value,
)

function payload(): OnboardPayload {
  const customer: OnboardPayload['customer'] = {}
  if (!customerFixed.value) {
    if (customerMode.value === 'existing' && existingContact.value)
      customer.contact_id = existingContact.value.id
    else
      customer.new = {
        name: newName.value.trim(),
        email: newEmail.value.trim(),
        phone: newPhone.value.trim(),
      }
  }
  return {
    customer,
    product_id: productId.value,
    quantity: quantity.value.trim() || '1',
    unit_price: unitPrice.value.trim(),
    billing_day: billingDayNumber.value,
    create_initial_invoice: createInitialInvoice.value,
  }
}

// --- ringkasan & eksekusi ---
const preview = useOnboardPreviewMutation()
const run = useOnboardRunMutation()
const plan = ref<OnboardPlan | null>(null)
const summaryOpen = ref(false)
// Penjaga lokal: klik ganda sebelum status mutation berubah tidak boleh mengirim dua kali.
const running = ref(false)

async function review() {
  if (!formReady.value) return
  try {
    plan.value = await preview.mutateAsync({ secretId: secret.value.id, payload: payload() })
    summaryOpen.value = true
  } catch (error) {
    toast.error(secretActionError(error))
  }
}

async function useExisting(contact: OnboardContactRef) {
  customerMode.value = 'existing'
  existingContact.value = contact
  await review()
}

async function execute() {
  if (running.value || !formReady.value) return
  running.value = true
  try {
    await run.mutateAsync({ secretId: secret.value.id, payload: payload() })
    summaryOpen.value = false
    toast.success(`Onboarding ${secret.value.name} selesai: kontrak dibuat dan secret dipasangkan.`)
    emit('done')
  } catch (error) {
    summaryOpen.value = false
    toast.error(secretActionError(error))
  } finally {
    running.value = false
  }
}

const STAGES: { key: Exclude<OnboardStage, ''>; label: string }[] = [
  { key: 'contact', label: 'Kontak' },
  { key: 'deal', label: 'Deal' },
  { key: 'quotation', label: 'Penawaran' },
  { key: 'sales_order', label: 'Sales order' },
  { key: 'confirmed', label: 'Kontrak' },
  { key: 'paired', label: 'Secret dipasangkan' },
]
const doneIndex = computed(() => STAGES.findIndex((s) => s.key === (onboarding.value?.stage ?? '')))
</script>

<template>
  <BaseCard class="space-y-4">
    <div>
      <h2 class="text-base font-semibold">Onboarding pelanggan</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Buat kontak, deal, penawaran, sales order, dan kontrak dari secret ini dalam satu langkah.
      </p>
    </div>

    <!-- Sudah punya kontrak: onboarding ditutup. -->
    <div v-if="detail.contract" class="space-y-1 text-sm" data-testid="onboard-contract">
      <p>
        Secret ini sudah punya kontrak
        <RouterLink
          :to="{ name: 'contract-detail', params: { id: detail.contract.id } }"
          class="font-medium text-brand-600"
          data-testid="contract-link"
          >{{ detail.contract.number }}</RouterLink
        >.
      </p>
      <p v-if="!detail.onboarding" class="text-xs text-gray-500">
        Kontrak ini milik pelanggan yang sudah terpasang sebelum onboarding dari secret tersedia.
      </p>
    </div>
    <p v-else-if="!detail.can_onboard" class="text-sm text-amber-700" role="status">
      Secret ini belum bisa di-onboard: tidak lagi ada di router atau profil asli belum diisi.
    </p>

    <template v-else>
      <!-- Progres tahap (onboarding yang terhenti di tengah) -->
      <div v-if="inProgress" class="space-y-2 rounded-lg border p-3 text-sm">
        <ol class="flex flex-wrap gap-2">
          <li
            v-for="(s, i) in STAGES"
            :key="s.key"
            class="rounded-full px-2 py-0.5 text-xs"
            :class="
              i <= doneIndex
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
            "
          >
            {{ i <= doneIndex ? '✓ ' : '' }}{{ s.label }}
          </li>
        </ol>
        <p v-if="onboarding?.last_error" class="text-red-600" role="alert">
          Terhenti: {{ onboarding.last_error }}
        </p>
        <p class="text-xs text-gray-500">
          Tahap yang sudah selesai tidak diulang. Lengkapi produk dan tanggal tagih lalu lanjutkan.
        </p>
      </div>

      <!-- Pelanggan -->
      <fieldset class="space-y-3">
        <legend class="text-sm font-medium">Pelanggan</legend>
        <p v-if="secret.account_id" class="text-sm">
          {{ secret.account_name || 'Pelanggan terpasang' }}
          <span class="text-xs text-gray-500">(dari pasangan secret saat ini)</span>
        </p>
        <p v-else-if="onboarding?.contact_id" class="text-sm text-gray-600 dark:text-gray-300">
          Kontak sudah dibuat pada percobaan sebelumnya.
        </p>
        <template v-else>
          <div class="flex flex-wrap gap-4 text-sm">
            <label class="flex items-center gap-2">
              <input v-model="customerMode" type="radio" name="customer_mode" value="new" />
              Kontak baru
            </label>
            <label class="flex items-center gap-2">
              <input v-model="customerMode" type="radio" name="customer_mode" value="existing" />
              Pilih kontak yang sudah ada
            </label>
          </div>
          <div v-if="customerMode === 'new'" class="grid gap-3 sm:grid-cols-3">
            <label class="block text-sm">
              <span class="mb-1 block text-xs font-medium">Nama</span>
              <input v-model="newName" name="new_name" class="w-full rounded-lg border px-3 py-2" />
            </label>
            <label class="block text-sm">
              <span class="mb-1 block text-xs font-medium">Nomor WhatsApp</span>
              <input
                v-model="newPhone"
                name="new_phone"
                inputmode="tel"
                class="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label class="block text-sm">
              <span class="mb-1 block text-xs font-medium">Email</span>
              <input
                v-model="newEmail"
                name="new_email"
                type="email"
                class="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <p class="text-xs text-gray-500 sm:col-span-3">
              Isi email atau nomor WhatsApp agar invoice bisa dikirim. Kontak dengan email/WA yang
              sama ditolak dan Anda akan ditawari kontak yang sudah ada.
            </p>
          </div>
          <div v-else class="space-y-2">
            <p v-if="existingContact" class="text-sm">
              Dipilih: <span class="font-medium">{{ existingContact.name }}</span>
              <button
                type="button"
                class="ml-2 text-xs text-brand-600"
                @click="existingContact = null"
              >
                Ganti
              </button>
            </p>
            <ContactPicker v-else :initial-query="secret.name" @pick="existingContact = $event" />
          </div>
        </template>
      </fieldset>

      <!-- Produk & tagihan -->
      <fieldset class="grid gap-3 sm:grid-cols-4">
        <legend class="mb-2 text-sm font-medium sm:col-span-4">Produk dan tagihan</legend>
        <p v-if="catalogEmpty" class="text-sm sm:col-span-4">
          Belum ada produk berulang di katalog.
          <RouterLink
            :to="{ name: 'crm-products' }"
            class="font-medium text-brand-600"
            data-testid="create-product"
            >Buat produk</RouterLink
          >
          lebih dulu.
        </p>
        <label class="block text-sm sm:col-span-2">
          <span class="mb-1 block text-xs font-medium">Produk</span>
          <select
            v-model="productId"
            name="product_id"
            class="w-full rounded-lg border bg-white px-3 py-2 dark:bg-gray-950"
          >
            <option value="" disabled>Pilih produk</option>
            <option v-for="p in recurringProducts" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="mb-1 block text-xs font-medium">Jumlah</span>
          <input
            v-model="quantity"
            name="quantity"
            inputmode="decimal"
            class="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label class="block text-sm">
          <span class="mb-1 block text-xs font-medium">Harga satuan</span>
          <input
            v-model="unitPrice"
            name="unit_price"
            inputmode="decimal"
            class="w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label class="block text-sm sm:col-span-2">
          <span class="mb-1 block text-xs font-medium">Tanggal tagih setiap bulan (1–31)</span>
          <input
            v-model="billingDay"
            name="billing_day"
            type="number"
            min="1"
            max="31"
            class="w-full rounded-lg border px-3 py-2"
            :class="{ 'border-red-500': !billingDayValid }"
            @input="billingDayTouched = true"
          />
          <span class="mt-1 block text-xs text-gray-500"
            >Kontrak dimulai pada awal siklus tagih yang sedang berjalan.</span
          >
        </label>
        <label class="flex items-start gap-2 text-sm sm:col-span-2 sm:pt-6">
          <input v-model="createInitialInvoice" type="checkbox" name="create_initial_invoice" />
          <span>
            Buat invoice awal sekarang
            <span class="block text-xs text-gray-500"
              >Biarkan kosong untuk pelanggan lama: invoice terbit otomatis pada jadwalnya.</span
            >
          </span>
        </label>
      </fieldset>

      <div class="flex justify-end gap-2">
        <BaseButton
          v-if="inProgress"
          data-testid="onboard-resume"
          :disabled="!formReady || running"
          @click="execute"
        >
          {{ running ? 'Melanjutkan…' : 'Lanjutkan' }}
        </BaseButton>
        <BaseButton
          v-else
          data-testid="onboard-review"
          :disabled="!formReady || catalogEmpty || preview.isPending.value"
          @click="review"
        >
          {{ preview.isPending.value ? 'Memeriksa…' : 'Tinjau ringkasan' }}
        </BaseButton>
      </div>
    </template>

    <OnboardingSummaryDialog
      :open="summaryOpen"
      :plan="plan"
      :loading="running || preview.isPending.value"
      @run="execute"
      @use-existing="useExisting"
      @close="summaryOpen = false"
    />
  </BaseCard>
</template>
