<script setup lang="ts">
import { ref } from 'vue'
import { Cloud } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'

import { useGoogleSignIn } from '@/features/auth/composables/useGoogleSignIn'

const route = useRoute()
const googleButton = ref<HTMLElement | null>(null)

const { googleEnabled, googleError, isGoogleSubmitting } = useGoogleSignIn({
  buttonRef: googleButton,
  text: 'signup_with',
  redirectPath: () => (typeof route.query.redirect === 'string' ? route.query.redirect : undefined),
})
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
      <p class="mt-2 text-sm text-gray-500">
        Daftar dengan akun Google Anda. Workspace dan paket gratis dibuat otomatis — langsung siap
        dipakai.
      </p>
    </div>

    <div v-if="googleEnabled" class="space-y-3">
      <div
        ref="googleButton"
        class="min-h-11 w-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
        :class="{ 'pointer-events-none opacity-60': isGoogleSubmitting }"
      />
      <p v-if="isGoogleSubmitting" class="text-center text-sm text-gray-500">Memproses...</p>
      <p v-if="googleError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ googleError }}
      </p>
    </div>

    <p v-else class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      Pendaftaran Google belum dikonfigurasi pada environment ini.
    </p>

    <p class="mt-6 text-xs leading-relaxed text-gray-500">
      Dengan melanjutkan, Anda menyetujui
      <RouterLink
        :to="{ name: 'legal-terms' }"
        class="font-semibold text-brand-600 hover:text-brand-500"
        >Syarat &amp; Ketentuan</RouterLink
      >
      dan
      <RouterLink
        :to="{ name: 'legal-privacy' }"
        class="font-semibold text-brand-600 hover:text-brand-500"
        >Kebijakan Privasi</RouterLink
      >
      Zyad Cloud.
    </p>

    <p class="mt-8 text-center text-sm text-gray-500">
      Sudah punya akun?
      <RouterLink
        :to="{
          name: 'login',
          query: route.query.redirect ? { redirect: route.query.redirect } : undefined,
        }"
        class="font-semibold text-brand-600 hover:text-brand-500"
        >Masuk di sini</RouterLink
      >
    </p>
  </div>
</template>
