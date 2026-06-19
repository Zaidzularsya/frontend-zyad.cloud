<script setup lang="ts">
import { ref } from 'vue'
import { Cloud, Github } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { RouterLink } from 'vue-router'

const isRegistering = ref(false)
const registerSuccess = ref(false)

const simulateSocialLogin = () => {
  isRegistering.value = true
  setTimeout(() => {
    isRegistering.value = false
    registerSuccess.value = true
  }, 1500)
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="mb-8">
      <span
        class="mb-5 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"
      >
        <Cloud class="size-6" />
      </span>
      <h1 class="text-3xl font-bold">Mulai Gratis</h1>
      <p class="mt-2 text-sm text-gray-500">Daftar menggunakan akun sosial Anda.</p>
    </div>

    <div v-if="!registerSuccess" class="space-y-4">
      <BaseButton
        variant="outline"
        class="flex w-full items-center justify-center gap-2"
        :disabled="isRegistering"
        @click="simulateSocialLogin"
      >
        <svg class="size-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l2.85-2.22.83-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {{ isRegistering ? 'Memproses...' : 'Daftar dengan Google' }}
      </BaseButton>
      <BaseButton
        variant="outline"
        class="flex w-full items-center justify-center gap-2"
        :disabled="isRegistering"
        @click="simulateSocialLogin"
      >
        <Github class="size-5" />
        {{ isRegistering ? 'Memproses...' : 'Daftar dengan GitHub' }}
      </BaseButton>

      <p class="mt-8 text-center text-sm text-gray-500">
        Sudah punya akun?
        <RouterLink
          :to="{ name: 'login' }"
          class="font-semibold text-brand-600 hover:text-brand-500"
          >Masuk di sini</RouterLink
        >
      </p>
    </div>

    <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
      <h3 class="mb-2 text-lg font-bold">Registrasi Berhasil!</h3>
      <p class="text-sm">
        Super admin akan meninjau pendaftaran Anda. Kami akan mengirimkan email undangan verifikasi
        segera setelah akun Anda disetujui.
      </p>
    </div>
  </div>
</template>
