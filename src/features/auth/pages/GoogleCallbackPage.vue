<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { consumeGoogleAuthRedirect } from '@/features/auth/composables/useGoogleSignIn'
import { resolvePostLoginRedirect } from '@/features/auth/utils/post-login-redirect'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const errorMessage = ref('')

onMounted(async () => {
  const googleError = route.query.google_error
  if (googleError) {
    await router.replace({ name: 'login', query: { google_error: '1' } })
    return
  }

  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (!code) {
    await router.replace({ name: 'login' })
    return
  }

  try {
    await auth.completeGoogleRedirect(code)
    const redirect = consumeGoogleAuthRedirect()
    await router.replace(resolvePostLoginRedirect(auth, redirect))
  } catch {
    errorMessage.value = 'Login Google belum berhasil. Pastikan akun Google Anda valid.'
    await router.replace({ name: 'login', query: { google_error: '1' } })
  }
})
</script>

<template>
  <div class="flex w-full max-w-md flex-col items-center gap-3 text-center">
    <p class="text-sm text-gray-500">Menyelesaikan login Google...</p>
    <p v-if="errorMessage" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
  </div>
</template>
