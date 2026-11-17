import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { emailApi } from '@/features/email/api/email.api'
import type { MicrosoftOAuthStartPayload } from '@/features/email/types'
import { emailErrorMessage } from '@/features/email/utils/errors'

// The callback page (outside /app and /platform) reads this to return the
// user to the email accounts page they started from.
const RETURN_KEY = 'zyad.mailbox-oauth.return'

export type MailboxOAuthReturnRoute = 'email-accounts' | 'platform-email-accounts'

export function consumeMailboxOAuthReturn(): MailboxOAuthReturnRoute {
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
  } catch {
    // Storage blocked: fall back to the tenant page.
  }
  return stored === 'platform-email-accounts' ? stored : 'email-accounts'
}

/** Sends the browser to Microsoft's sign-in page for a mailbox connect/reconnect. */
export function useMicrosoftMailboxConnect() {
  const route = useRoute()
  const redirecting = ref(false)
  const error = ref('')

  async function connect(payload: MicrosoftOAuthStartPayload = {}) {
    error.value = ''
    redirecting.value = true
    try {
      const url = await emailApi.startMicrosoftOAuth(payload)
      const returnRoute: MailboxOAuthReturnRoute = String(route.name ?? '').startsWith('platform-')
        ? 'platform-email-accounts'
        : 'email-accounts'
      try {
        sessionStorage.setItem(RETURN_KEY, returnRoute)
      } catch {
        // Not fatal: the callback falls back to the tenant page.
      }
      window.location.assign(url)
    } catch (err) {
      error.value = emailErrorMessage(err)
      redirecting.value = false
    }
  }

  return { connect, redirecting, error }
}
