<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import TextField from '@/components/form/TextField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useCreateRouterMutation,
  useUpdateRouterMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import type { Router, UpdateRouterPayload } from '@/features/mikrotik/types'
import { routerActionError } from '@/features/mikrotik/utils/errors'

const props = defineProps<{ open: boolean; router?: Router | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved', router: Router): void }>()

const createMutation = useCreateRouterMutation()
const updateMutation = useUpdateRouterMutation()

const isEdit = computed(() => Boolean(props.router))
const form = reactive({
  name: '',
  host: '',
  port: '8728',
  username: '',
  password: '',
  use_tls: false,
  tls_fingerprint: '',
})
const errorMessage = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    form.name = props.router?.name ?? ''
    form.host = props.router?.host ?? ''
    form.port = String(props.router?.port ?? 8728)
    form.username = props.router?.username ?? ''
    form.password = ''
    form.use_tls = props.router?.use_tls ?? false
    form.tls_fingerprint = props.router?.tls_fingerprint ?? ''
  },
  { immediate: true },
)

const pending = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

async function submit() {
  if (pending.value) return
  errorMessage.value = ''
  const base = {
    name: form.name.trim(),
    host: form.host.trim(),
    port: Number(form.port),
    username: form.username.trim(),
    use_tls: form.use_tls,
    tls_fingerprint: form.tls_fingerprint.trim(),
  }
  try {
    if (props.router) {
      // Password write-only: kosong berarti tidak diubah, jadi tidak dikirim sama sekali.
      const payload: UpdateRouterPayload = { ...base }
      if (form.password !== '') payload.password = form.password
      emit('saved', await updateMutation.mutateAsync({ id: props.router.id, payload }))
    } else {
      emit('saved', await createMutation.mutateAsync({ ...base, password: form.password }))
    }
  } catch (error) {
    errorMessage.value = routerActionError(error)
  }
}
</script>

<template>
  <BaseModal :open="open" :title="isEdit ? 'Ubah router' : 'Tambah router'" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <TextField v-model="form.name" name="name" label="Nama router" placeholder="Core-1" />
      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2">
          <TextField v-model="form.host" name="host" label="Host / IP" placeholder="10.0.0.1" />
        </div>
        <TextField v-model="form.port" name="port" label="Port API" type="number" />
      </div>
      <TextField v-model="form.username" name="username" label="Username API" />
      <TextField
        v-model="form.password"
        name="password"
        label="Password API"
        type="password"
        autocomplete="new-password"
        :placeholder="isEdit ? 'Kosongkan bila tidak diubah' : ''"
      />
      <label class="flex items-center gap-2 text-sm">
        <input
          v-model="form.use_tls"
          type="checkbox"
          class="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        Gunakan TLS
      </label>
      <TextField
        v-if="form.use_tls"
        v-model="form.tls_fingerprint"
        name="tls_fingerprint"
        label="Fingerprint TLS (opsional)"
      />

      <details class="rounded-lg border p-3 text-sm text-gray-600 dark:text-gray-300">
        <summary class="cursor-pointer font-medium">User API Mikrotik dengan hak minimum</summary>
        <div class="mt-2 space-y-2">
          <p>
            Zyad tidak membuat user di router. Buat sendiri user/grup khusus dengan policy minimum:
          </p>
          <ul class="list-disc pl-5">
            <li>API biner: <code>api</code>, <code>read</code>, <code>write</code></li>
            <li>
              REST: <code>rest-api</code>, <code>read</code>, <code>write</code> (service
              <code>www-ssl</code>/<code>www</code> aktif)
            </li>
            <li>
              <code>test</code>, <code>sensitive</code>, <code>policy</code>, <code>ftp</code> tidak
              dibutuhkan
            </li>
          </ul>
          <p>
            Batasi akses API lewat firewall router agar hanya bisa dijangkau dari alamat platform.
            Hak minimum ini belum terbukti dengan user non-full di lab.
          </p>
        </div>
      </details>

      <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400" role="alert">
        {{ errorMessage }}
      </p>
      <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <BaseButton variant="outline" @click="$emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="pending">
          {{ pending ? 'Menyimpan...' : 'Simpan' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
