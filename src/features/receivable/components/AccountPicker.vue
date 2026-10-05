<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Plus, Search, UserRound } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { Account } from '@/features/receivable/api/receivable.api'
import {
  useAccountsQuery,
  useCreateAccountMutation,
} from '@/features/receivable/api/receivable.queries'
import { receivableErrorMessage } from '@/features/receivable/utils/errors'
import { isValidEmail } from '@/features/receivable/utils/send-invoice'

const props = defineProps<{ accountId: string; initial?: Account | null; disabled?: boolean }>()
const emit = defineEmits<{
  (e: 'update:accountId', id: string): void
  (e: 'select', account: Account): void
}>()

const selected = ref<Account | null>(props.initial ?? null)
watch(
  () => props.initial,
  (account) => {
    if (account && account.id === props.accountId) selected.value = account
  },
)

const searchInput = ref('')
const search = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

const params = computed(() => ({ page: 1, per_page: 8, search: search.value || undefined }))
const accountsQuery = useAccountsQuery(params)
const accounts = computed(() => accountsQuery.data.value?.data ?? [])

function choose(account: Account) {
  selected.value = account
  creating.value = false
  emit('update:accountId', account.id)
  emit('select', account)
}

function clear() {
  selected.value = null
  emit('update:accountId', '')
}

// Pelanggan baru dibuat di tempat; tanpa kontak CRM sehingga hanya bisa dikirimi email.
const creating = ref(false)
const form = ref({ name: '', company_name: '', email: '', phone: '', address: '' })
const formError = ref('')
const createMutation = useCreateAccountMutation()

function startCreate() {
  form.value = {
    name: searchInput.value.trim(),
    company_name: '',
    email: '',
    phone: '',
    address: '',
  }
  formError.value = ''
  creating.value = true
}

async function create() {
  formError.value = ''
  if (!form.value.name.trim()) {
    formError.value = 'Nama pelanggan wajib diisi.'
    return
  }
  if (form.value.email.trim() && !isValidEmail(form.value.email)) {
    formError.value = 'Alamat email belum valid.'
    return
  }
  try {
    const account = await createMutation.mutateAsync({
      name: form.value.name.trim(),
      company_name: form.value.company_name.trim() || undefined,
      email: form.value.email.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
      address: form.value.address.trim() || undefined,
    })
    choose(account)
  } catch (error) {
    formError.value = receivableErrorMessage(error, 'Pelanggan gagal dibuat. Coba lagi.')
  }
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <div class="space-y-3 text-sm">
    <div v-if="selected" class="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div class="flex gap-2">
        <UserRound class="mt-0.5 size-4 text-gray-400" />
        <div>
          <p class="font-medium">{{ selected.name }}</p>
          <p v-if="selected.company_name" class="text-gray-600 dark:text-gray-300">
            {{ selected.company_name }}
          </p>
          <p class="text-xs text-gray-500">
            {{ selected.email || 'Tanpa email' }}
            <span v-if="!selected.contact_id"> · WhatsApp tidak tersedia (bukan kontak CRM)</span>
          </p>
        </div>
      </div>
      <BaseButton v-if="!disabled" variant="outline" @click="clear">Ganti</BaseButton>
    </div>

    <template v-else>
      <label class="block space-y-1">
        <span class="font-medium">Cari pelanggan</span>
        <span class="relative block">
          <Search class="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
          <input
            v-model="searchInput"
            name="account-search"
            :class="[inputClass, 'pl-9']"
            placeholder="Nama, perusahaan, atau email"
          />
        </span>
      </label>
      <ul
        v-if="accounts.length > 0"
        class="divide-y rounded-lg border"
        role="listbox"
        aria-label="Hasil pencarian pelanggan"
      >
        <li v-for="a in accounts" :key="a.id">
          <button
            type="button"
            role="option"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
            @click="choose(a)"
          >
            <span class="font-medium">{{ a.name }}</span>
            <span v-if="a.company_name" class="text-gray-600 dark:text-gray-300">
              · {{ a.company_name }}</span
            >
            <span class="block text-xs text-gray-500">{{ a.email || 'Tanpa email' }}</span>
          </button>
        </li>
      </ul>
      <p v-else-if="!accountsQuery.isPending.value" class="text-gray-500">
        Belum ada pelanggan yang cocok.
      </p>

      <BaseButton v-if="!creating" variant="outline" @click="startCreate">
        <Plus class="size-4" /> Pelanggan baru
      </BaseButton>
      <form v-else class="space-y-3 rounded-lg border p-3" @submit.prevent="create">
        <label class="block space-y-1"
          ><span class="font-medium">Nama</span
          ><input v-model="form.name" name="account-name" maxlength="200" :class="inputClass"
        /></label>
        <label class="block space-y-1"
          ><span class="font-medium">Perusahaan</span
          ><input
            v-model="form.company_name"
            name="account-company"
            maxlength="200"
            :class="inputClass"
        /></label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block space-y-1"
            ><span class="font-medium">Email</span
            ><input v-model="form.email" type="email" name="account-email" :class="inputClass"
          /></label>
          <label class="block space-y-1"
            ><span class="font-medium">Telepon</span
            ><input v-model="form.phone" name="account-phone" maxlength="50" :class="inputClass"
          /></label>
        </div>
        <label class="block space-y-1"
          ><span class="font-medium">Alamat</span
          ><textarea v-model="form.address" name="account-address" rows="2" :class="inputClass" />
        </label>
        <p v-if="formError" class="text-red-600" role="alert">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="creating = false">Batal</BaseButton>
          <BaseButton type="submit" :disabled="createMutation.isPending.value">
            {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan pelanggan' }}
          </BaseButton>
        </div>
      </form>
    </template>
  </div>
</template>
