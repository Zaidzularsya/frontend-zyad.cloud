<script setup lang="ts">
import { ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { LockKeyhole } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'

import BaseButton from '@/components/ui/BaseButton.vue'
import TextField from '@/components/form/TextField.vue'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const submitError = ref('')

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

const onSubmit = handleSubmit(async (values) => {
  submitError.value = ''
  try {
    await auth.login(values)

    const isSuperAdmin = auth.user?.roles?.includes('super_admin')
    const defaultRedirect = isSuperAdmin ? '/platform/dashboard' : '/app/profile'

    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : defaultRedirect
    await router.replace(redirect)
  } catch {
    submitError.value = 'Email atau password tidak sesuai, atau server sedang tidak tersedia.'
  }
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
  </div>
</template>
