<script setup lang="ts">
import { useRouter } from 'vue-router'
import { PauseCircle } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()
const supportEmail = env.VITE_SUPPORT_EMAIL

function switchWorkspace() {
  void router.push({ name: 'select-tenant' })
}

async function signOut() {
  await auth.logout()
  void router.replace({ name: 'login' })
}
</script>

<template>
  <div
    class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 text-center"
  >
    <PauseCircle class="size-14 text-amber-500" aria-hidden="true" />
    <div class="space-y-2">
      <h1 class="text-2xl font-bold tracking-tight">Workspace ditangguhkan</h1>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Bila penangguhan karena tagihan, link pembayaran sudah dikirim ke email owner workspace.
        Workspace aktif kembali otomatis setelah tagihan lunas.
      </p>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <a
        v-if="supportEmail"
        :href="`mailto:${supportEmail}`"
        class="text-sm font-semibold text-brand-600 hover:underline"
        data-testid="support-link"
        >Hubungi support</a
      >
      <BaseButton variant="outline" @click="switchWorkspace">Ganti workspace</BaseButton>
      <BaseButton variant="secondary" @click="signOut">Keluar</BaseButton>
    </div>
  </div>
</template>
