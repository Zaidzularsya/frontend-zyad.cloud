import { reactive, readonly } from 'vue'

import type { EmailEntityType } from '@/features/email/types'

export interface ComposeDraft {
  to?: string[]
  cc?: string[]
  subject?: string
  bodyHtml?: string
  inReplyTo?: string
  /** Links the sent email to this CRM record's timeline. */
  relatedEntityType?: EmailEntityType
  relatedEntityId?: string
}

interface ComposeState {
  open: boolean
  minimized: boolean
  /** Bumped on every open so the dock resets its form. */
  session: number
  draft: ComposeDraft
}

// Module-level: one compose window for the whole app (like Gmail), opened
// from any page and rendered once by <EmailComposeDock> in the layout.
const state = reactive<ComposeState>({ open: false, minimized: false, session: 0, draft: {} })

export function useEmailCompose() {
  return {
    state: readonly(state),
    open(draft: ComposeDraft = {}) {
      state.draft = { ...draft }
      state.session += 1
      state.open = true
      state.minimized = false
    },
    close() {
      state.open = false
    },
    setMinimized(minimized: boolean) {
      state.minimized = minimized
    },
  }
}
