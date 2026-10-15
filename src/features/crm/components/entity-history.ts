import type { Activity } from '@/features/crm/activities/api/activities.api'
import type { LeadEvent } from '@/features/crm/leads/api/leads.api'

export type HistoryFilter = 'all' | 'interaction' | 'note' | 'change'

export interface HistoryItem {
  key: string
  at: string
  kind: 'activity' | 'event'
  group: Exclude<HistoryFilter, 'all'>
  activity?: Activity
  event?: LeadEvent
  /** Respons customer atas penawaran: ditampilkan sebagai kartu kontras. */
  highlight?: 'approved' | 'revision'
}

export function splitActivities(activities: Activity[]) {
  const live = activities.filter((a) => !a.deleted_at)
  const pending = live.filter((a) => a.status === 'pending')
  return {
    playbookStep: pending.find((a) => a.playbook) ?? null,
    otherPending: pending
      .filter((a) => !a.playbook)
      .sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999')),
    done: live.filter((a) => a.status !== 'pending'),
  }
}

function highlightOf(a: Activity): HistoryItem['highlight'] {
  if (a.type !== 'quotation_response') return undefined
  return a.metadata?.action === 'revision_requested' ? 'revision' : 'approved'
}

export function mergeHistory(activities: Activity[], events: LeadEvent[]): HistoryItem[] {
  const fromActivities: HistoryItem[] = splitActivities(activities).done.map((a) => ({
    key: `activity-${a.id}`,
    at: a.completed_at ?? a.updated_at,
    kind: 'activity',
    group: a.type === 'note' ? 'note' : 'interaction',
    activity: a,
    highlight: highlightOf(a),
  }))
  const fromEvents: HistoryItem[] = events.map((e) => ({
    key: `event-${e.id}`,
    at: e.created_at,
    kind: 'event',
    group: 'change',
    event: e,
  }))
  return [...fromActivities, ...fromEvents].sort((a, b) => b.at.localeCompare(a.at))
}

export function filterHistory(items: HistoryItem[], filter: HistoryFilter, keyword: string) {
  const q = keyword.trim().toLowerCase()
  return items.filter((item) => {
    if (filter !== 'all' && item.group !== filter) return false
    if (!q) return true
    const text = item.activity
      ? `${item.activity.subject} ${item.activity.description ?? ''}`
      : `${item.event?.event_type ?? ''} ${item.event?.to_value ?? ''} ${item.event?.actor_name ?? ''}`
    return text.toLowerCase().includes(q)
  })
}
