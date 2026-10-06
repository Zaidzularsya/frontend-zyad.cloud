import type {
  BillingStatus,
  SalesOrderDraftForm,
  SalesOrderItem,
  SalesOrderStatus,
} from '@/features/crm/sales-orders/api/sales-orders.api'

export type Tone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'slate'

export const SO_STATUS: Record<SalesOrderStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'gray' },
  confirmed: { label: 'Dikonfirmasi', tone: 'blue' },
  completed: { label: 'Selesai', tone: 'green' },
  cancelled: { label: 'Dibatalkan', tone: 'slate' },
}

export const BILLING_STATUS: Record<BillingStatus, { label: string; tone: Tone }> = {
  none: { label: 'Belum ditagih', tone: 'gray' },
  pending: { label: 'Sedang ditagih', tone: 'amber' },
  done: { label: 'Tertagih', tone: 'green' },
  failed: { label: 'Penagihan gagal', tone: 'red' },
}

export const TONE_CLASS: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  slate: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const GROUP_TITLES = {
  oneTimePrepaid: 'Sekali bayar · Prabayar',
  oneTimePostpaid: 'Sekali bayar · Pascabayar',
  recurring: 'Berulang',
} as const

// Urutan & judul grup tetap; grup kosong tidak ditampilkan.
export function groupSalesOrderItems(
  items: SalesOrderItem[],
): { title: string; items: SalesOrderItem[] }[] {
  const oneTimePrepaid: SalesOrderItem[] = []
  const oneTimePostpaid: SalesOrderItem[] = []
  const recurring: SalesOrderItem[] = []
  for (const item of items) {
    if (item.charge_type === 'recurring') recurring.push(item)
    else if (item.payment_timing === 'postpaid') oneTimePostpaid.push(item)
    else oneTimePrepaid.push(item)
  }
  return [
    { title: GROUP_TITLES.oneTimePrepaid, items: oneTimePrepaid },
    { title: GROUP_TITLES.oneTimePostpaid, items: oneTimePostpaid },
    { title: GROUP_TITLES.recurring, items: recurring },
  ].filter((g) => g.items.length > 0)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function todayISO(now: Date): string {
  // Hari bisnis WIB (UTC+7), sama dengan backend.
  const wib = new Date(now.getTime() + 7 * 3600 * 1000)
  return wib.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Pesan per field untuk form SO; kosong = valid. Aturan sama dengan syarat konfirmasi di server (R7).
export function validateSalesOrderDraft(
  form: SalesOrderDraftForm,
  hasContact: boolean,
  now: Date = new Date(),
): string[] {
  const errors: string[] = []
  if (!form.start_date) errors.push('Tanggal mulai wajib diisi.')
  else if (form.start_date < addDays(todayISO(now), -30))
    errors.push('Tanggal mulai paling awal 30 hari yang lalu.')
  const name = form.bill_to_name.trim()
  if (name.length < 2 || name.length > 200)
    errors.push('Nama penagihan wajib diisi (2–200 karakter).')
  if (form.channels.length === 0) errors.push('Pilih minimal satu kanal pengiriman.')
  if (form.channels.includes('email') && !EMAIL_PATTERN.test(form.bill_to_email.trim()))
    errors.push('Email penagihan tidak valid.')
  if (form.channels.includes('whatsapp') && (!hasContact || !form.bill_to_phone.trim()))
    errors.push('WhatsApp butuh kontak CRM dan nomor telepon.')
  return errors
}

// Field backend (SALES_ORDER_INCOMPLETE.data.fields) → pesan Indonesia.
export const FIELD_MESSAGES: Record<string, string> = {
  start_date: 'Tanggal mulai wajib diisi (paling awal 30 hari yang lalu).',
  bill_to_name: 'Nama penagihan wajib diisi (2–200 karakter).',
  channels: 'Pilih minimal satu kanal pengiriman.',
  bill_to_email: 'Email penagihan tidak valid.',
  bill_to_phone: 'Nomor telepon penagihan wajib untuk WhatsApp.',
  contact_id: 'WhatsApp butuh kontak CRM.',
}

export const canEditDraft = (s: SalesOrderStatus) => s === 'draft'
export const canRetryBilling = (s: SalesOrderStatus, b: BillingStatus) =>
  (s === 'confirmed' || s === 'completed') && (b === 'failed' || b === 'pending')
export const pendingDeliveryItems = (items: SalesOrderItem[]) =>
  items.filter((i) => i.delivery_status === 'pending')

export function soDraftFormFrom(so: {
  start_date: string | null
  bill_to_name: string
  bill_to_company: string
  bill_to_email: string
  bill_to_phone: string
  bill_to_address: string
  channels: SalesOrderDraftForm['channels']
  pic_user_id: string
}): SalesOrderDraftForm {
  return {
    start_date: so.start_date ?? '',
    bill_to_name: so.bill_to_name,
    bill_to_company: so.bill_to_company,
    bill_to_email: so.bill_to_email,
    bill_to_phone: so.bill_to_phone,
    bill_to_address: so.bill_to_address,
    channels: [...so.channels],
    pic_user_id: so.pic_user_id,
  }
}
