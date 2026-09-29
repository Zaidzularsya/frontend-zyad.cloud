import type { ActivityType } from '@/features/crm/activities/api/activities.api'
import type { LeadActivityItem, LeadStatus } from '@/features/crm/leads/api/leads.api'
import { leadStatusLabels } from '@/features/crm/leads/utils/lead-status'

export const activityTypeLabels: Record<ActivityType, string> = {
  call: 'Telepon',
  email: 'Email',
  meeting: 'Meeting',
  task: 'Task',
  note: 'Catatan',
  whatsapp: 'WhatsApp',
}

/** A piece of a feed sentence; strong parts are names. */
export interface FeedSegment {
  text: string
  strong?: boolean
}

function statusLabel(value?: string) {
  return value && value in leadStatusLabels ? leadStatusLabels[value as LeadStatus] : (value ?? '')
}

/**
 * Builds the sentence for one recent-activity item as plain segments (no
 * HTML), e.g. [Rizky S.] memindahkan [Maya] ke [Qualified].
 */
export function feedSegments(item: LeadActivityItem): FeedSegment[] {
  const actor: FeedSegment | null = item.actor_name ? { text: item.actor_name, strong: true } : null
  const lead: FeedSegment = { text: item.lead_name, strong: true }
  const typeLabel = item.activity_type ? activityTypeLabels[item.activity_type] : 'Aktivitas'
  const subject = item.subject ? ` “${item.subject}”` : ''

  // The chat flow creates WhatsApp activities already completed, so neither
  // "menyelesaikan" nor "menjadwalkan" is true: it is just a conversation.
  if (
    item.activity_type === 'whatsapp' &&
    (item.kind === 'activity_created' || item.kind === 'activity_completed')
  ) {
    return [{ text: 'Percakapan WhatsApp dengan ' }, lead]
  }

  switch (item.kind) {
    case 'created':
      return actor ? [actor, { text: ' menambahkan lead ' }, lead] : [{ text: 'Lead baru ' }, lead]
    case 'status_changed':
      return [
        ...(actor ? [actor, { text: ' memindahkan ' }] : []),
        lead,
        { text: actor ? ' ke ' : ' pindah ke ' },
        { text: statusLabel(item.to_value), strong: true },
      ]
    case 'assigned':
      if (!item.to_value) {
        return [
          ...(actor ? [actor, { text: ' melepas' }] : [{ text: 'Melepas' }]),
          { text: ' owner ' },
          lead,
        ]
      }
      return [
        ...(actor ? [actor, { text: ' meng-assign ' }] : [{ text: 'Assign ' }]),
        lead,
        { text: ' ke ' },
        { text: item.to_name || 'anggota lain', strong: true },
      ]
    case 'converted':
      return actor ? [actor, { text: ' mengonversi ' }, lead] : [lead, { text: ' dikonversi' }]
    case 'deleted':
      return actor ? [actor, { text: ' menghapus ' }, lead] : [lead, { text: ' dihapus' }]
    case 'restored':
      return actor ? [actor, { text: ' memulihkan ' }, lead] : [lead, { text: ' dipulihkan' }]
    case 'activity_completed':
      return [
        ...(actor ? [actor, { text: ' menyelesaikan ' }] : [{ text: 'Selesai: ' }]),
        { text: `${typeLabel.toLowerCase()}${subject} dengan ` },
        lead,
      ]
    case 'activity_created':
      return [
        ...(actor ? [actor, { text: ' menjadwalkan ' }] : [{ text: 'Dijadwalkan: ' }]),
        { text: `${typeLabel.toLowerCase()}${subject} untuk ` },
        lead,
      ]
    default:
      return [lead]
  }
}
