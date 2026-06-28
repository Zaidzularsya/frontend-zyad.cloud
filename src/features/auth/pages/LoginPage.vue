<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { LockKeyhole } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'

import BaseButton from '@/components/ui/BaseButton.vue'
import TextField from '@/components/form/TextField.vue'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/auth.store'

interface GoogleCredentialResponse {
  credential?: string
  select_by?: string
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const submitError = ref('')
const googleButton = ref<HTMLElement | null>(null)
const googleError = ref('')
const isGoogleSubmitting = ref(false)
const googleEnabled = Boolean(env.VITE_GOOGLE_CLIENT_ID)

const schema = toTypedSchema(
  z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    remember: z.boolean().default(false),
  }),
)

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: { email: '', password: '', remember: false },
})

const [email] = defineField('email')
const [password] = defineField('password')
const [remember] = defineField('remember')

let googleScriptPromise: Promise<void> | null = null
let disposed = false

function redirectAfterLogin() {
  const isSuperAdmin = auth.user?.roles?.includes('super_admin')
  const defaultRedirect = isSuperAdmin ? '/platform/dashboard' : '/app/dashboard'
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : defaultRedirect
  return router.replace(redirect)
}

const onSubmit = handleSubmit(async (values) => {
  submitError.value = ''
  try {
    await auth.login(values)
    await redirectAfterLogin()
  } catch {
    submitError.value = 'Email atau password tidak sesuai, atau server sedang tidak tersedia.'
  }
})

async function handleGoogleCredential(response: GoogleCredentialResponse) {
  googleError.value = ''
  if (!response.credential) {
    googleError.value = 'Login Google gagal. Silakan coba lagi.'
    return
  }

  isGoogleSubmitting.value = true
  try {
    await auth.loginWithGoogle({
      idToken: response.credential,
      remember: remember.value,
      deviceName: 'Web Browser',
    })
    await redirectAfterLogin()
  } catch {
    googleError.value = 'Login Google belum berhasil. Pastikan akun Google Anda valid.'
  } finally {
    isGoogleSubmitting.value = false
  }
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    )
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('google script failed')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('google script failed'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

async function renderGoogleButton() {
  if (!googleEnabled) return

  try {
    await loadGoogleScript()
    await nextTick()
    if (disposed || !googleButton.value || !window.google?.accounts?.id) return

    googleButton.value.innerHTML = ''
    window.google.accounts.id.initialize({
      client_id: env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => void handleGoogleCredential(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    window.google.accounts.id.renderButton(googleButton.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: googleButton.value.clientWidth || 384,
    })
  } catch {
    googleError.value = 'Tombol Google belum bisa dimuat. Coba refresh halaman.'
  }
}

onMounted(() => {
  void renderGoogleButton()
})

onUnmounted(() => {
  disposed = true
  window.google?.accounts?.id?.cancel()
})
</script>

<template>
  <div class="w-full max-w-md">
    <div class="mb-8">
      <span
        class="mb-5 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"
      >
        <LockKeyhole class="size-6" />
      </span>
      <h1 class="text-3xl font-bold">Masuk ke workspace</h1>
      <p class="mt-2 text-sm text-gray-500">Gunakan akun organisasi Zyad Cloud Anda.</p>
    </div>

    <p
      v-if="route.query.reason === 'session-expired'"
      class="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    >
      Sesi Anda berakhir. Silakan masuk kembali.
    </p>

    <form class="space-y-5" @submit="onSubmit">
      <TextField
        v-model="email"
        name="email"
        label="Email"
        type="email"
        autocomplete="email"
        placeholder="nama@perusahaan.com"
        :error="errors.email"
      />
      <TextField
        v-model="password"
        name="password"
        label="Password"
        type="password"
        autocomplete="current-password"
        placeholder="Minimal 8 karakter"
        :error="errors.password"
      />
      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          v-model="remember"
          type="checkbox"
          class="size-4 rounded border-gray-300 accent-brand-500"
        />
        Ingat perangkat ini
      </label>
      <p v-if="submitError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ submitError }}
      </p>
      <BaseButton type="submit" class="w-full" :disabled="isSubmitting">
        {{ isSubmitting ? 'Memverifikasi...' : 'Masuk' }}
      </BaseButton>
    </form>

    <div v-if="googleEnabled" class="my-6 flex items-center gap-3">
      <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      <span class="text-xs font-medium text-gray-400">atau</span>
      <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
    </div>

    <div v-if="googleEnabled" class="space-y-3">
      <div
        ref="googleButton"
        class="min-h-11 w-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
        :class="{ 'pointer-events-none opacity-60': isGoogleSubmitting }"
      />
      <p v-if="googleError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ googleError }}
      </p>
    </div>
  </div>
</template>
