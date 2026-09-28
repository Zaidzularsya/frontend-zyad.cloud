<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Building2, Mail, Pencil, Phone, Plus, Waypoints } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

import AttachmentCard, { type AttachmentItem } from '@/features/crm/components/AttachmentCard.vue'
import EntityTimeline from '@/features/crm/components/EntityTimeline.vue'

import type { ManualActivityType } from '@/features/crm/activities/api/activities.api'
import { useCompanyQuery } from '@/features/crm/companies/api/companies.queries'
import { useDealQuery } from '@/features/crm/deals/api/deals.queries'
import {
  leadsApi,
  type LeadAddress,
  type LeadPayload,
  type LeadStatus,
} from '@/features/crm/leads/api/leads.api'
import {
  useConvertLeadMutation,
  useCrmMembersQuery,
  useDeleteLeadAttachmentMutation,
  useLeadAttachmentsQuery,
  useLeadQuery,
  useUpdateLeadMutation,
  useUploadLeadAttachmentMutation,
} from '@/features/crm/leads/api/leads.queries'
import { compactAddress, isValidAnnualRevenue } from '@/features/crm/leads/utils/lead-form'
import ConversationPanel from '@/features/whatsapp/components/ConversationPanel.vue'
import { useEntityConversationQuery } from '@/features/whatsapp/api/whatsapp.queries'
import { useDocumentVisible } from '@/features/whatsapp/composables/useDocumentVisible'
import { useWhatsAppStream } from '@/features/whatsapp/composables/useWhatsAppStream'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()

const leadId = computed(() => String(route.params.id ?? ''))
// Halaman ini di-mount di dua prefix (tenant & platform), jadi path list
// diturunkan dari path saat ini, bukan dari nama route tertentu.
const listPath = computed(() => route.path.replace(/\/[^/]+$/, ''))

const leadQuery = useLeadQuery(leadId)
const lead = computed(() => leadQuery.data.value)

const updateMutation = useUpdateLeadMutation()
const convertMutation = useConvertLeadMutation()

const statusLabels: Record<LeadStatus, string> = {
  new: 'Baru',
  contacted: 'Dihubungi',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  converted: 'Converted',
}

function scoreLabel(score: number) {
  if (score >= 67) return 'HIGH'
  if (score >= 34) return 'MID'
  return 'LOW'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

const actionError = ref('')

async function changeStatus(event: Event) {
  if (!lead.value) return
  actionError.value = ''
  try {
    await updateMutation.mutateAsync({
      id: lead.value.id,
      payload: { status: (event.target as HTMLSelectElement).value as LeadStatus },
    })
  } catch (error) {
    actionError.value = extractError(error)
  }
}

async function convert() {
  if (!lead.value) return
  const withCompany = Boolean(lead.value.company_name)
  if (
    !confirm(
      `Convert lead "${lead.value.contact_name}" menjadi contact${withCompany ? ' + company' : ''}?`,
    )
  )
    return
  actionError.value = ''
  try {
    await convertMutation.mutateAsync({ id: lead.value.id, createCompany: withCompany })
  } catch (error) {
    actionError.value = extractError(error)
  }
}

// --- Panel tengah: Timeline | WhatsApp ---
const auth = useAuthStore()
const canUseWhatsApp = computed(() => auth.can('whatsapp.conversation.read'))
const middleTabs = [
  { value: 'timeline', label: 'Timeline' },
  // "Chat" makes clear this opens the conversation; the timeline still lists
  // the daily 'whatsapp' activities under "Activity".
  { value: 'whatsapp', label: 'Chat WhatsApp' },
] as const
const middleTab = ref<'timeline' | 'whatsapp'>('timeline')
const documentVisible = useDocumentVisible()
// Saat convert, percakapan WhatsApp lead dipindah ke contact barunya; lead
// yang sudah converted menampilkan chat milik contact tersebut.
const chatEntityType = computed(() =>
  lead.value?.converted_contact_id ? ('contact' as const) : ('lead' as const),
)
const chatEntityId = computed(() => lead.value?.converted_contact_id || leadId.value)
const leadConversationQuery = useEntityConversationQuery(chatEntityType, chatEntityId, {
  enabled: canUseWhatsApp,
  visible: documentVisible,
})
// Realtime chat + unread badge; queries poll slowly only while it is down.
useWhatsAppStream(canUseWhatsApp)
const whatsappUnread = computed(() => leadConversationQuery.data.value?.unread_count ?? 0)

const timelineRef = ref<InstanceType<typeof EntityTimeline> | null>(null)

function openComposer(type: ManualActivityType) {
  timelineRef.value?.openComposer(type)
}

// --- Panel kanan ---
const companyId = computed(() => lead.value?.converted_company_id ?? undefined)
const dealId = computed(() => lead.value?.converted_deal_id ?? undefined)
const companyQuery = useCompanyQuery(companyId)
const dealQuery = useDealQuery(dealId)
const company = computed(() => companyQuery.data.value)
const deal = computed(() => dealQuery.data.value)

// --- Info lead & address (panel kiri) ---
const infoTab = ref<'info' | 'address'>('info')

function formatRevenue(value?: string | null) {
  if (!value) return undefined
  const amount = Number(value)
  return Number.isFinite(amount) ? formatCurrency(amount) : value
}

const addressFields: { key: keyof LeadAddress; label: string }[] = [
  { key: 'street', label: 'Alamat' },
  { key: 'city', label: 'Kota' },
  { key: 'state', label: 'Provinsi' },
  { key: 'postal_code', label: 'Kode pos' },
  { key: 'country', label: 'Negara' },
]

const infoRows = computed(() => {
  if (!lead.value) return []
  return [
    { label: 'Email', value: lead.value.email },
    { label: 'Telepon', value: lead.value.phone },
    { label: 'Lead owner', value: lead.value.owner_name },
    { label: 'Job title', value: lead.value.job_title },
    { label: 'Annual revenue', value: formatRevenue(lead.value.annual_revenue) },
    { label: 'Sumber', value: lead.value.source },
    { label: 'Score', value: `${scoreLabel(lead.value.score)} · ${lead.value.score}` },
    { label: 'Dibuat', value: formatDate(lead.value.created_at) },
    { label: 'Update terakhir', value: formatDate(lead.value.updated_at) },
    {
      label: 'Converted',
      value: lead.value.converted_at ? formatDate(lead.value.converted_at) : undefined,
    },
  ]
})

const inputClass =
  'mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'

const isEditing = ref(false)
const editError = ref('')
const editForm = reactive({
  contact_name: '',
  company_name: '',
  email: '',
  phone: '',
  owner_user_id: '',
  job_title: '',
  annual_revenue: '',
  source: '',
  notes: '',
  address: {} as LeadAddress,
})

const membersQuery = useCrmMembersQuery()
const members = computed(() => membersQuery.data.value ?? [])

function startEdit() {
  if (!lead.value) return
  Object.assign(editForm, {
    contact_name: lead.value.contact_name,
    company_name: lead.value.company_name ?? '',
    email: lead.value.email ?? '',
    phone: lead.value.phone ?? '',
    owner_user_id: lead.value.owner_user_id ?? '',
    job_title: lead.value.job_title ?? '',
    annual_revenue: lead.value.annual_revenue ?? '',
    source: lead.value.source ?? '',
    notes: lead.value.notes ?? '',
    address: { ...lead.value.address },
  })
  editError.value = ''
  isEditing.value = true
}

async function saveEdit() {
  if (!lead.value) return
  editError.value = ''
  if (!editForm.contact_name.trim()) {
    editError.value = 'Nama kontak wajib diisi.'
    return
  }
  const revenue = editForm.annual_revenue.trim()
  if (!isValidAnnualRevenue(revenue)) {
    editError.value = 'Annual revenue harus angka tanpa pemisah ribuan, maks 2 desimal.'
    return
  }
  const payload: Partial<LeadPayload> = {
    contact_name: editForm.contact_name.trim(),
    company_name: editForm.company_name.trim(),
    email: editForm.email.trim(),
    phone: editForm.phone.trim(),
    owner_user_id: editForm.owner_user_id,
    job_title: editForm.job_title.trim(),
    annual_revenue: revenue,
    source: editForm.source.trim(),
    notes: editForm.notes,
    address: compactAddress(editForm.address),
  }
  try {
    await updateMutation.mutateAsync({ id: lead.value.id, payload })
    isEditing.value = false
  } catch (error) {
    editError.value = extractError(error)
  }
}

// --- Attachment (panel kanan) ---
const attachmentsQuery = useLeadAttachmentsQuery(leadId)
const attachments = computed(() => attachmentsQuery.data.value ?? [])
const uploadMutation = useUploadLeadAttachmentMutation()
const deleteAttachmentMutation = useDeleteLeadAttachmentMutation()
const attachmentError = ref('')

async function uploadAttachment(file: File) {
  if (!lead.value) return
  attachmentError.value = ''
  try {
    await uploadMutation.mutateAsync({ id: lead.value.id, file })
  } catch (error) {
    attachmentError.value = extractError(error)
  }
}

async function downloadAttachment(attachment: AttachmentItem) {
  attachmentError.value = ''
  try {
    const url = await leadsApi.attachmentDownloadUrl(leadId.value, attachment.id)
    window.open(url, '_blank', 'noopener')
  } catch (error) {
    attachmentError.value = extractError(error)
  }
}

async function removeAttachment(attachment: AttachmentItem) {
  if (!confirm(`Hapus lampiran "${attachment.filename}"?`)) return
  attachmentError.value = ''
  try {
    await deleteAttachmentMutation.mutateAsync({
      id: leadId.value,
      attachmentId: attachment.id,
    })
  } catch (error) {
    attachmentError.value = extractError(error)
  }
}
</script>

<template>
  <div>
    <div v-if="leadQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </div>
    <div v-else-if="leadQuery.isError.value || !lead" class="p-12 text-center">
      <p class="font-semibold text-red-700">Lead tidak ditemukan.</p>
      <button class="mt-2 text-sm font-medium text-brand-600" @click="router.push(listPath)">
        Kembali ke daftar lead
      </button>
    </div>

    <div v-else class="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      <!-- Panel kiri: profil -->
      <BaseCard class="space-y-5 !p-5">
        <button
          class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          @click="router.push(listPath)"
        >
          <ArrowLeft class="size-4" />
          Back to leads
        </button>

        <div class="text-center">
          <div
            class="mx-auto grid size-20 place-items-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700"
          >
            {{ initials(lead.contact_name) }}
          </div>
          <h1 class="mt-3 text-lg font-bold">{{ lead.contact_name }}</h1>
          <p v-if="lead.company_name" class="text-sm text-gray-500">{{ lead.company_name }}</p>
          <span
            v-if="lead.deleted_at"
            class="mt-2 inline-block rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          >
            Dihapus
          </span>
        </div>

        <div class="flex justify-center gap-4 text-xs text-gray-600">
          <button class="grid justify-items-center gap-1" @click="openComposer('note')">
            <span class="grid size-10 place-items-center rounded-full border"
              ><Plus class="size-4"
            /></span>
            Log
          </button>
          <a
            v-if="lead.email"
            :href="`mailto:${lead.email}`"
            class="grid justify-items-center gap-1"
          >
            <span class="grid size-10 place-items-center rounded-full border"
              ><Mail class="size-4"
            /></span>
            Email
          </a>
          <a v-if="lead.phone" :href="`tel:${lead.phone}`" class="grid justify-items-center gap-1">
            <span class="grid size-10 place-items-center rounded-full border"
              ><Phone class="size-4"
            /></span>
            Call
          </a>
        </div>

        <BaseButton
          v-if="lead.status !== 'converted' && !lead.deleted_at"
          class="w-full"
          :disabled="convertMutation.isPending.value"
          @click="convert"
        >
          Convert to contact
        </BaseButton>
        <p v-if="actionError" class="text-sm text-red-600">{{ actionError }}</p>

        <div>
          <label class="text-xs text-gray-500" for="lead-status">Status</label>
          <select
            id="lead-status"
            class="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            :value="lead.status"
            :disabled="lead.status === 'converted' || Boolean(lead.deleted_at)"
            @change="changeStatus"
          >
            <option
              v-for="(label, value) in statusLabels"
              :key="value"
              :value="value"
              :disabled="value === 'converted'"
            >
              {{ label }}
            </option>
          </select>
        </div>

        <div class="border-t pt-2">
          <div class="flex items-center border-b text-sm">
            <button
              v-for="tab in [
                { value: 'info', label: 'Leads info' },
                { value: 'address', label: 'Address info' },
              ] as const"
              :key="tab.value"
              class="flex-1 border-b-2 py-2 font-medium"
              :class="
                infoTab === tab.value
                  ? 'border-brand-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              "
              @click="infoTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>

          <form v-if="isEditing" class="space-y-3 pt-4 text-sm" @submit.prevent="saveEdit">
            <template v-if="infoTab === 'info'">
              <label class="block">
                <span class="text-xs text-gray-500">Nama kontak</span>
                <input v-model="editForm.contact_name" :class="inputClass" required />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Company</span>
                <input v-model="editForm.company_name" :class="inputClass" />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Email</span>
                <input v-model="editForm.email" type="email" :class="inputClass" />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Telepon</span>
                <input v-model="editForm.phone" :class="inputClass" />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Lead owner</span>
                <select v-model="editForm.owner_user_id" :class="inputClass">
                  <option value="">Tanpa owner</option>
                  <option v-for="member in members" :key="member.user_id" :value="member.user_id">
                    {{ member.name }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Job title</span>
                <input v-model="editForm.job_title" maxlength="150" :class="inputClass" />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Annual revenue (IDR)</span>
                <input
                  v-model="editForm.annual_revenue"
                  inputmode="decimal"
                  placeholder="5000000"
                  :class="inputClass"
                />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Sumber</span>
                <input v-model="editForm.source" :class="inputClass" />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Catatan</span>
                <textarea v-model="editForm.notes" rows="3" :class="inputClass" />
              </label>
            </template>
            <template v-else>
              <label v-for="field in addressFields" :key="field.key" class="block">
                <span class="text-xs text-gray-500">{{ field.label }}</span>
                <input v-model="editForm.address[field.key]" :class="inputClass" />
              </label>
            </template>

            <p v-if="editError" class="text-red-600">{{ editError }}</p>
            <div class="flex justify-end gap-2">
              <BaseButton variant="secondary" @click="isEditing = false">Batal</BaseButton>
              <BaseButton type="submit" :disabled="updateMutation.isPending.value">
                {{ updateMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
              </BaseButton>
            </div>
          </form>

          <template v-else>
            <div v-if="!lead.deleted_at" class="flex justify-end pt-2">
              <button
                class="inline-flex items-center gap-1 text-xs font-medium text-brand-600"
                @click="startEdit"
              >
                <Pencil class="size-3.5" />
                Edit
              </button>
            </div>
            <dl v-if="infoTab === 'info'" class="space-y-3 pt-2 text-sm">
              <div v-for="row in infoRows" :key="row.label">
                <dt class="text-xs text-gray-500">{{ row.label }}</dt>
                <dd class="break-words">{{ row.value || '-' }}</dd>
              </div>
              <div v-if="lead.notes">
                <dt class="text-xs text-gray-500">Catatan</dt>
                <dd class="whitespace-pre-line break-words">{{ lead.notes }}</dd>
              </div>
            </dl>
            <dl v-else class="space-y-3 pt-2 text-sm">
              <div v-for="field in addressFields" :key="field.key">
                <dt class="text-xs text-gray-500">{{ field.label }}</dt>
                <dd class="break-words">{{ lead.address?.[field.key] || '-' }}</dd>
              </div>
            </dl>
          </template>
        </div>
      </BaseCard>

      <!-- Panel tengah: timeline activity | chat WhatsApp -->
      <BaseCard class="space-y-4 !p-5">
        <div
          v-if="canUseWhatsApp"
          role="tablist"
          aria-label="Panel lead"
          class="flex gap-1 border-b dark:border-gray-800"
        >
          <button
            v-for="tab in middleTabs"
            :id="`lead-tab-${tab.value}`"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="middleTab === tab.value"
            :aria-controls="`lead-panel-${tab.value}`"
            class="-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-500"
            :class="
              middleTab === tab.value
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            "
            @click="middleTab = tab.value"
          >
            {{ tab.label }}
            <span
              v-if="tab.value === 'whatsapp' && whatsappUnread > 0"
              class="rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white"
              :aria-label="`${whatsappUnread} pesan belum dibaca`"
            >
              {{ whatsappUnread }}
            </span>
          </button>
        </div>

        <div
          v-if="canUseWhatsApp && middleTab === 'whatsapp'"
          id="lead-panel-whatsapp"
          role="tabpanel"
          aria-labelledby="lead-tab-whatsapp"
          class="flex h-[calc(100dvh-16rem)] min-h-[30rem] flex-col"
        >
          <ConversationPanel
            :related-entity-type="chatEntityType"
            :related-entity-id="chatEntityId"
            :phone="lead.phone"
            :entity-name="lead.contact_name"
            :active="middleTab === 'whatsapp'"
            @edit-phone="startEdit"
          />
        </div>

        <div
          v-show="!canUseWhatsApp || middleTab === 'timeline'"
          id="lead-panel-timeline"
          role="tabpanel"
          aria-labelledby="lead-tab-timeline"
        >
          <EntityTimeline
            ref="timelineRef"
            related-entity-type="lead"
            :related-entity-id="leadId"
          />
        </div>
      </BaseCard>

      <!-- Panel kanan: company & deals -->
      <div class="space-y-4">
        <BaseCard class="space-y-3 !p-5">
          <h2 class="font-semibold">Company</h2>
          <div class="flex items-center gap-3">
            <span class="grid size-10 place-items-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Building2 class="size-5 text-gray-500" />
            </span>
            <div class="min-w-0">
              <p class="truncate font-medium">{{ company?.name || lead.company_name || '-' }}</p>
              <p v-if="company?.website" class="truncate text-xs text-gray-500">
                {{ company.website }}
              </p>
            </div>
          </div>
          <div
            v-if="company?.email || company?.phone || lead.email || lead.phone"
            class="space-y-2 rounded-xl border p-3 text-sm"
          >
            <p v-if="company?.email || lead.email" class="flex items-center gap-2 break-all">
              <Mail class="size-4 shrink-0 text-gray-400" />{{ company?.email || lead.email }}
            </p>
            <p v-if="company?.phone || lead.phone" class="flex items-center gap-2">
              <Phone class="size-4 shrink-0 text-gray-400" />{{ company?.phone || lead.phone }}
            </p>
          </div>
        </BaseCard>

        <BaseCard class="space-y-3 !p-5">
          <h2 class="font-semibold">Deals</h2>
          <div v-if="deal" class="rounded-xl border p-3">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <Waypoints class="size-3.5" />
              <span class="uppercase">{{ deal.status }}</span>
              <span v-if="deal.expected_close_date">
                · Closing: {{ formatDate(deal.expected_close_date) }}
              </span>
            </div>
            <p class="mt-1 font-medium">{{ deal.title }}</p>
            <p class="text-sm font-semibold">
              {{ formatCurrency(Number(deal.value), deal.currency) }}
            </p>
          </div>
          <p v-else class="text-sm text-gray-500">
            {{ dealId ? 'Memuat deal...' : 'Belum ada deal untuk lead ini.' }}
          </p>
        </BaseCard>

        <AttachmentCard
          :attachments="attachments"
          :loading="attachmentsQuery.isPending.value"
          :uploading="uploadMutation.isPending.value"
          :deleting="deleteAttachmentMutation.isPending.value"
          :readonly="Boolean(lead.deleted_at)"
          :error="attachmentError"
          @upload="uploadAttachment"
          @download="downloadAttachment"
          @remove="removeAttachment"
        />
      </div>
    </div>
  </div>
</template>
