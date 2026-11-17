<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import TextField from '@/components/form/TextField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useCreateMailboxMutation,
  useMicrosoftOAuthStatusQuery,
  useUpdateMailboxMutation,
} from '@/features/email/api/email.queries'
import { useMicrosoftMailboxConnect } from '@/features/email/composables/useMicrosoftMailboxConnect'
import type { MailSecurity, Mailbox, MailboxPayload } from '@/features/email/types'
import { emailErrorMessage } from '@/features/email/utils/errors'

const props = defineProps<{
  open: boolean
  /** Edit this mailbox; connect a new one when absent. */
  mailbox?: Mailbox | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', mailbox: Mailbox, created: boolean): void
}>()

type ProviderKey = 'gmail' | 'outlook' | 'zoho' | 'custom'

interface Provider {
  label: string
  smtp_host: string
  smtp_port: number
  smtp_security: MailSecurity
  imap_host: string
  imap_port: number
  hint: string
}

const providers: Record<Exclude<ProviderKey, 'custom'>, Provider> = {
  gmail: {
    label: 'Gmail / Google Workspace',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_security: 'ssl',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    hint: 'Gunakan App Password (Akun Google → Keamanan → Verifikasi 2 langkah → Sandi aplikasi), bukan password login biasa.',
  },
  outlook: {
    label: 'Outlook / Microsoft 365',
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_security: 'starttls',
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    // Shown only when the server has no Microsoft app registration: password
    // login is the fallback, and Microsoft is retiring it.
    hint: 'Microsoft sudah menghentikan login password untuk SMTP. Cara ini hanya berfungsi bila admin Microsoft 365 masih mengaktifkan "Authenticated SMTP" dengan basic auth.',
  },
  zoho: {
    label: 'Zoho Mail',
    smtp_host: 'smtp.zoho.com',
    smtp_port: 465,
    smtp_security: 'ssl',
    imap_host: 'imap.zoho.com',
    imap_port: 993,
    hint: 'Aktifkan akses IMAP/SMTP di pengaturan Zoho Mail; gunakan App Password bila 2FA aktif.',
  },
}

const createMutation = useCreateMailboxMutation()
const updateMutation = useUpdateMailboxMutation()
const pending = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const isEdit = computed(() => Boolean(props.mailbox))

const provider = ref<ProviderKey>('gmail')
const errorMessage = ref('')
const form = reactive({
  email_address: '',
  display_name: '',
  username: '',
  password: '',
  smtp_host: '',
  smtp_port: 465,
  smtp_security: 'ssl' as MailSecurity,
  imap_host: '',
  imap_port: 993,
})

const microsoftStatus = useMicrosoftOAuthStatusQuery()
const microsoft = useMicrosoftMailboxConnect()
const isOAuthMailbox = computed(() => props.mailbox?.auth_method === 'microsoft_oauth')
/** Outlook goes through "Masuk dengan Microsoft" when the server supports it. */
const useMicrosoftSignIn = computed(
  () =>
    isOAuthMailbox.value || (provider.value === 'outlook' && microsoftStatus.data.value === true),
)

function applyProvider(key: ProviderKey) {
  if (key === 'custom') return
  const preset = providers[key]
  Object.assign(form, {
    smtp_host: preset.smtp_host,
    smtp_port: preset.smtp_port,
    smtp_security: preset.smtp_security,
    imap_host: preset.imap_host,
    imap_port: preset.imap_port,
  })
}

function detectProvider(host: string): ProviderKey {
  const match = (Object.keys(providers) as (keyof typeof providers)[]).find(
    (key) => providers[key].smtp_host === host,
  )
  return match ?? 'custom'
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    const mailbox = props.mailbox
    if (mailbox) {
      Object.assign(form, {
        email_address: mailbox.email_address,
        display_name: mailbox.display_name,
        username: mailbox.username === mailbox.email_address ? '' : mailbox.username,
        password: '',
        smtp_host: mailbox.smtp_host,
        smtp_port: mailbox.smtp_port,
        smtp_security: mailbox.smtp_security,
        imap_host: mailbox.imap_host,
        imap_port: mailbox.imap_port || 993,
      })
      provider.value =
        mailbox.auth_method === 'microsoft_oauth' ? 'outlook' : detectProvider(mailbox.smtp_host)
    } else {
      Object.assign(form, { email_address: '', display_name: '', username: '', password: '' })
      provider.value = 'gmail'
      applyProvider('gmail')
    }
  },
  { immediate: true },
)

watch(provider, (key) => {
  if (isOAuthMailbox.value) return
  if (!props.mailbox || key !== detectProvider(props.mailbox.smtp_host)) applyProvider(key)
})

const hint = computed(() =>
  provider.value === 'custom' || useMicrosoftSignIn.value ? '' : providers[provider.value].hint,
)

function connectMicrosoft() {
  errorMessage.value = ''
  void microsoft.connect({
    mailbox_id: props.mailbox?.id,
    display_name: form.display_name.trim() || undefined,
  })
}

async function submit() {
  errorMessage.value = ''
  // A new Outlook mailbox, or switching a password one to OAuth, needs the
  // Microsoft redirect; an OAuth mailbox only saves its display name here.
  if (useMicrosoftSignIn.value && !isOAuthMailbox.value) {
    connectMicrosoft()
    return
  }
  if (!isEdit.value && !form.password) {
    errorMessage.value = 'Password wajib diisi.'
    return
  }
  const payload: MailboxPayload = {
    email_address: form.email_address.trim(),
    display_name: form.display_name.trim(),
    username: form.username.trim() || undefined,
    password: form.password || undefined,
    smtp_host: form.smtp_host.trim(),
    smtp_port: Number(form.smtp_port),
    smtp_security: form.smtp_security,
    // IMAP is stored now and used once inbox sync is enabled.
    imap_host: form.imap_host.trim() || undefined,
    imap_port: form.imap_host.trim() ? Number(form.imap_port) : undefined,
    imap_security: form.imap_host.trim()
      ? Number(form.imap_port) === 143
        ? 'starttls'
        : 'ssl'
      : undefined,
  }
  try {
    if (props.mailbox) {
      emit('saved', await updateMutation.mutateAsync({ id: props.mailbox.id, payload }), false)
    } else {
      emit('saved', await createMutation.mutateAsync(payload), true)
    }
  } catch (error) {
    errorMessage.value = emailErrorMessage(error)
  }
}

const selectClass =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900'
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEdit ? 'Pengaturan akun email' : 'Hubungkan akun email'"
    @close="$emit('close')"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Penyedia email
        </span>
        <select v-model="provider" :class="selectClass" :disabled="isOAuthMailbox">
          <option v-for="(item, key) in providers" :key="key" :value="key">{{ item.label }}</option>
          <option value="custom">Server lain (manual)</option>
        </select>
      </label>
      <p
        v-if="hint"
        class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
      >
        {{ hint }}
      </p>

      <div
        v-if="useMicrosoftSignIn"
        class="space-y-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300"
      >
        <p v-if="isOAuthMailbox">
          Terhubung lewat login Microsoft sebagai
          <span class="font-medium text-gray-900 dark:text-white">{{ mailbox?.email_address }}</span
          >. Password tidak disimpan. Jika status bermasalah, hubungkan ulang.
        </p>
        <p v-else>
          Anda akan diarahkan ke halaman login Microsoft. Alamat email diambil dari akun yang Anda
          pilih, dan password tidak disimpan di Zyad.
        </p>
        <p class="text-xs text-gray-500">
          Akun Microsoft 365 kantor: admin harus mengizinkan "Authenticated SMTP" untuk mailbox ini.
        </p>
      </div>

      <TextField
        v-if="!useMicrosoftSignIn"
        v-model="form.email_address"
        name="email_address"
        type="email"
        label="Alamat email"
        placeholder="nama@perusahaan.com"
        autocomplete="email"
      />
      <TextField
        v-model="form.display_name"
        name="display_name"
        label="Nama pengirim (opsional)"
        placeholder="Contoh: Lisa - Zyad Technovation"
      />
      <template v-if="!useMicrosoftSignIn">
        <TextField
          v-model="form.password"
          name="password"
          type="password"
          :label="
            isEdit
              ? 'Password / App Password (kosongkan jika tidak diganti)'
              : 'Password / App Password'
          "
          autocomplete="new-password"
        />

        <details :open="provider === 'custom'" class="rounded-lg border p-3 dark:border-gray-800">
          <summary class="cursor-pointer text-sm font-medium">Pengaturan server</summary>
          <div class="mt-3 space-y-3">
            <TextField
              v-model="form.username"
              name="username"
              label="Username (kosongkan bila sama dengan alamat email)"
              autocomplete="off"
            />
            <div class="grid gap-3 sm:grid-cols-[1fr_6rem_8rem]">
              <TextField v-model="form.smtp_host" name="smtp_host" label="SMTP host" />
              <label class="block">
                <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Port
                </span>
                <select v-model.number="form.smtp_port" :class="selectClass">
                  <option :value="465">465</option>
                  <option :value="587">587</option>
                  <option :value="25">25</option>
                  <option :value="2525">2525</option>
                </select>
              </label>
              <label class="block">
                <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Keamanan
                </span>
                <select v-model="form.smtp_security" :class="selectClass">
                  <option value="ssl">SSL/TLS</option>
                  <option value="starttls">STARTTLS</option>
                </select>
              </label>
            </div>
            <div class="grid gap-3 sm:grid-cols-[1fr_6rem]">
              <TextField
                v-model="form.imap_host"
                name="imap_host"
                label="IMAP host (untuk inbox, opsional)"
              />
              <label class="block">
                <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Port
                </span>
                <select v-model.number="form.imap_port" :class="selectClass">
                  <option :value="993">993</option>
                  <option :value="143">143</option>
                </select>
              </label>
            </div>
          </div>
        </details>

        <p class="text-xs text-gray-500">
          Koneksi diuji saat disimpan. Password disimpan terenkripsi dan hanya dipakai untuk
          mengirim email Anda sendiri.
        </p>
      </template>
      <p v-if="errorMessage || microsoft.error.value" class="text-sm text-red-600" role="alert">
        {{ errorMessage || microsoft.error.value }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <BaseButton variant="secondary" type="button" @click="$emit('close')">Batal</BaseButton>
        <BaseButton
          v-if="isOAuthMailbox"
          variant="outline"
          type="button"
          :disabled="microsoft.redirecting.value"
          @click="connectMicrosoft"
        >
          {{ microsoft.redirecting.value ? 'Mengarahkan...' : 'Hubungkan ulang' }}
        </BaseButton>
        <BaseButton
          v-if="useMicrosoftSignIn && !isOAuthMailbox"
          type="submit"
          :disabled="microsoft.redirecting.value"
        >
          {{
            microsoft.redirecting.value ? 'Mengarahkan ke Microsoft...' : 'Masuk dengan Microsoft'
          }}
        </BaseButton>
        <BaseButton v-else type="submit" :disabled="pending">
          {{ pending ? 'Menguji koneksi...' : isEdit ? 'Simpan' : 'Hubungkan' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
