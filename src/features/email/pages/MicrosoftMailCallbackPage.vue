<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import { emailApi } from '@/features/email/api/email.api'
import { emailKeys } from '@/features/email/api/email.queries'
import { consumeMailboxOAuthReturn } from '@/features/email/composables/useMicrosoftMailboxConnect'
import { emailErrorMessage } from '@/features/email/utils/errors'

// Microsoft redirects here with ?code&state (or ?error). The code is
// exchanged by the backend under the signed-in user's session, which is
// also what ties the Microsoft account to this user.
const route = useRoute()
const router = useRouter()
const toast = useToast()
const queryClient = useQueryClient()
const returnRoute = consumeMailboxOAuthReturn()
const errorMessage = ref('')

function query(name: string): string {
  const value = route.query[name]
  return typeof value === 'string' ? value : ''
}

onMounted(async () => {
  const microsoftError = query('error')
  if (microsoftError) {
    errorMessage.value =
      microsoftError === 'access_denied'
        ? 'Login Microsoft dibatalkan atau izin tidak diberikan.'
        : `Login Microsoft gagal: ${query('error_description') || microsoftError}`
    return
  }

  const code = query('code')
  const state = query('state')
  if (!code || !state) {
    errorMessage.value =
      'Tautan login Microsoft tidak lengkap. Silakan ulangi dari halaman Akun Email.'
    return
  }

  try {
    const { mailbox, created } = await emailApi.completeMicrosoftOAuth(code, state)
    await queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() })
    toast.success(
      created
        ? `${mailbox.email_address} terhubung dengan Microsoft.`
        : `${mailbox.email_address} kini memakai login Microsoft.`,
    )
    await router.replace({ name: returnRoute })
  } catch (error) {
    errorMessage.value = emailErrorMessage(error)
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
    <template v-if="!errorMessage">
      <p class="text-sm text-gray-500" role="status">Menghubungkan akun Microsoft...</p>
    </template>
    <template v-else>
      <p
        class="w-full rounded-lg bg-red-50 p-3 text-sm break-words text-red-700 dark:bg-red-500/10 dark:text-red-300"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <BaseButton @click="router.replace({ name: returnRoute })">Kembali ke Akun Email</BaseButton>
    </template>
  </div>
</template>
