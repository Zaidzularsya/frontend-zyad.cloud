import type { MessageStatus, WhatsAppMessage } from '@/features/whatsapp/types'

export interface DayGroup {
  key: string
  label: string
  messages: WhatsAppMessage[]
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** Groups chronological messages by local calendar day for date separators. */
export function groupByDay(messages: WhatsAppMessage[], now: Date = new Date()): DayGroup[] {
  const today = dayKey(now)
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const groups: DayGroup[] = []
  for (const message of messages) {
    const sentAt = new Date(message.sent_at)
    const key = dayKey(sentAt)
    let group = groups.at(-1)
    if (!group || group.key !== key) {
      const label =
        key === today
          ? 'Hari ini'
          : key === yesterday
            ? 'Kemarin'
            : sentAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      group = { key, label, messages: [] }
      groups.push(group)
    }
    group.messages.push(message)
  }
  return groups
}

export function messageTime(message: WhatsAppMessage): string {
  return new Date(message.sent_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Screen-reader label for an outgoing message's delivery status. */
export const messageStatusLabels: Record<MessageStatus, string> = {
  pending: 'Mengirim',
  sent: 'Terkirim',
  delivered: 'Diterima',
  read: 'Dibaca',
  failed: 'Gagal terkirim',
}
