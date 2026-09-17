<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import {
  useCreateFinanceBusinessPartnerMutation,
  useUpdateFinanceBusinessPartnerMutation,
} from '@/features/finance/api/business-partners.queries'
import type {
  FinanceBusinessPartner,
  FinancePartnerType,
} from '@/features/finance/api/business-partners.api'

const props = defineProps<{ open: boolean; partner?: FinanceBusinessPartner | null }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const createMutation = useCreateFinanceBusinessPartnerMutation()
const updateMutation = useUpdateFinanceBusinessPartnerMutation()
const errorMessage = ref('')

const form = reactive({
  partner_type: 'customer' as FinancePartnerType,
  code: '',
  name: '',
  tax_id: '',
  address: '',
  control_account_id: '',
  is_active: true,
})

const isEdit = ref(false)

watch(
  () => props.open,
  (open) => {
    errorMessage.value = ''
    if (!open) return
    if (props.partner) {
      isEdit.value = true
      form.partner_type = props.partner.partner_type
      form.code = props.partner.code
      form.name = props.partner.name
      form.tax_id = props.partner.tax_id ?? ''
      form.address = props.partner.address ?? ''
      form.control_account_id = props.partner.control_account_id
      form.is_active = props.partner.is_active
    } else {
      isEdit.value = false
      form.partner_type = 'customer'
      form.code = ''
      form.name = ''
      form.tax_id = ''
      form.address = ''
      form.control_account_id = ''
      form.is_active = true
    }
  },
)

async function submit() {
  errorMessage.value = ''
  if (!form.code || !form.name || (!isEdit.value && !form.control_account_id)) {
    errorMessage.value = 'Kode, nama, dan akun kontrol wajib diisi.'
    return
  }
  try {
    if (isEdit.value && props.partner) {
      await updateMutation.mutateAsync({
        id: props.partner.id,
        payload: {
          name: form.name,
          tax_id: form.tax_id || undefined,
          address: form.address || undefined,
          is_active: form.is_active,
        },
      })
    } else {
      await createMutation.mutateAsync({
        partner_type: form.partner_type,
        code: form.code,
        name: form.name,
        tax_id: form.tax_id || undefined,
        address: form.address || undefined,
        control_account_id: form.control_account_id,
      })
    }
    emit('saved')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal menyimpan mitra bisnis.'
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEdit ? 'Ubah Mitra Bisnis' : 'Mitra Bisnis Baru'"
    @close="$emit('close')"
  >
    <form class="space-y-3" @submit.prevent="submit">
      <label class="block text-sm font-medium">
        Tipe
        <select
          v-model="form.partner_type"
          :disabled="isEdit"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="customer">Pelanggan (Customer)</option>
          <option value="vendor">Pemasok (Vendor)</option>
        </select>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Kode
          <input
            v-model="form.code"
            type="text"
            :disabled="isEdit"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Nama
          <input
            v-model="form.name"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label v-if="!isEdit" class="block text-sm font-medium">
        Akun Kontrol GL (Piutang/Utang)
        <AccountPickerSelect v-model="form.control_account_id" />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          NPWP
          <input
            v-model="form.tax_id"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Alamat
          <input
            v-model="form.address"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label v-if="isEdit" class="flex items-center gap-2 text-sm font-medium">
        <input v-model="form.is_active" type="checkbox" class="size-4" />
        Aktif
      </label>

      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" @click="$emit('close')">Batal</BaseButton>
        <BaseButton
          type="submit"
          :disabled="createMutation.isPending.value || updateMutation.isPending.value"
        >
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
