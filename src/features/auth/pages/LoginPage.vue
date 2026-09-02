<script setup lang="ts">
import { ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'

import BaseButton from '@/components/ui/BaseButton.vue'
import TextField from '@/components/form/TextField.vue'
import BrandLogo from '@/features/branding/components/BrandLogo.vue'
import { useGoogleSignIn } from '@/features/auth/composables/useGoogleSignIn'
import { resolvePostLoginRedirect } from '@/features/auth/utils/post-login-redirect'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const submitError = ref('')
const googleButton = ref<HTMLElement | null>(null)

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

function redirectAfterLogin() {
  return router.replace(resolvePostLoginRedirect(auth, route.query.redirect))
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

const { googleEnabled, googleError, isGoogleSubmitting } = useGoogleSignIn({
  buttonRef: googleButton,
  text: 'signin_with',
  redirectPath: () => (typeof route.query.redirect === 'string' ? route.query.redirect : undefined),
})
</script>

<template>
  <div class="w-full max-w-md">
    <div class="mb-8">
      <BrandLogo class="mb-5 h-10" />
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
        class="flex min-h-11 w-full justify-center overflow-hidden"
        :class="{ 'pointer-events-none opacity-60': isGoogleSubmitting }"
      />
      <p v-if="googleError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ googleError }}
      </p>
    </div>

    <p class="mt-8 text-center text-sm text-gray-500">
      Belum punya akun?
      <RouterLink
        :to="{
          name: 'register',
          query: route.query.redirect ? { redirect: route.query.redirect } : undefined,
        }"
        class="font-semibold text-brand-600 hover:text-brand-500"
        >Daftar gratis</RouterLink
      >
    </p>
  </div>
</template>
