<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Building2, Mail, Pencil, Phone, Plus, Target, Waypoints } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

import { useCompaniesQuery } from '@/features/crm/companies/api/companies.queries'
import AttachmentCard, { type AttachmentItem } from '@/features/crm/components/AttachmentCard.vue'
import EntityTimeline from '@/features/crm/components/EntityTimeline.vue'
import {
  contactsApi,
  type ContactLifecycleStage,
  type ContactPayload,
} from '@/features/crm/contacts/api/contacts.api'
import {
  useContactAttachmentsQuery,
  useContactQuery,
  useDeleteContactAttachmentMutation,
  useUpdateContactMutation,
  useUploadContactAttachmentMutation,
} from '@/features/crm/contacts/api/contacts.queries'
import { useDealsQuery } from '@/features/crm/deals/api/deals.queries'
import EntityEmailPanel from '@/features/email/components/EntityEmailPanel.vue'
import { useEmailCompose } from '@/features/email/composables/useEmailCompose'
import type { LeadAddress } from '@/features/crm/leads/api/leads.api'
import { useCrmMembersQuery, useLeadsQuery } from '@/features/crm/leads/api/leads.queries'
import { compactAddress } from '@/features/crm/leads/utils/lead-form'
import ConversationPanel from '@/features/whatsapp/components/ConversationPanel.vue'
import { useEntityConversationQuery } from '@/features/whatsapp/api/whatsapp.queries'
import { useDocumentVisible } from '@/features/whatsapp/composables/useDocumentVisible'
import { useWhatsAppStream } from '@/features/whatsapp/composables/useWhatsAppStream'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()

const contactId = computed(() => String(route.params.id ?? ''))
// Di-mount di dua prefix (tenant & platform): path list & detail lead/deal
// diturunkan dari path saat ini, bukan dari nama route tertentu.
const listPath = computed(() => route.path.replace(/\/[^/]+$/, ''))
const crmBasePath = computed(() => listPath.value.replace(/\/contacts$/, ''))

const contactQuery = useContactQuery(contactId)
const contact = computed(() => contactQuery.data.value)
const fullName = computed(() =>
  [contact.value?.first_name, contact.value?.last_name].filter(Boolean).join(' '),
)
const isDeleted = computed(() => Boolean(contact.value?.deleted_at))

const updateMutation = useUpdateContactMutation()

const lifecycleLabels: Record<ContactLifecycleStage, string> = {
  lead: 'Lead',
  contact: 'Contact',
  customer: 'Customer',
  churned: 'Churned',
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

// --- Relasi: company, lead asal, deals ---
const companyListParams = computed(() => ({ page: 1, per_page: 100 }))
const companiesQuery = useCompaniesQuery(companyListParams)
const companies = computed(() => companiesQuery.data.value?.data ?? [])
const company = computed(() =>
  companies.value.find((item) => item.id === contact.value?.company_id),
)

const leadParams = computed(() => ({
  page: 1,
  per_page: 10,
  converted_contact_id: contactId.value,
}))
const leadsQuery = useLeadsQuery(leadParams)
const sourceLeads = computed(() => leadsQuery.data.value?.data ?? [])

const dealParams = computed(() => ({ page: 1, per_page: 10, contact_id: contactId.value }))
const dealsQuery = useDealsQuery(dealParams)
const deals = computed(() => dealsQuery.data.value?.data ?? [])

const membersQuery = useCrmMembersQuery()
const members = computed(() => membersQuery.data.value ?? [])
const ownerName = computed(
  () => members.value.find((member) => member.user_id === contact.value?.owner_user_id)?.name,
)

// --- Panel tengah: Timeline | WhatsApp | Email ---
const auth = useAuthStore()
const canUseWhatsApp = computed(() => auth.can('whatsapp.conversation.read'))
type MiddleTab = 'timeline' | 'whatsapp' | 'email'
const middleTabs = computed(() =>
  [
    { value: 'timeline' as const, label: 'Timeline' },
    { value: 'whatsapp' as const, label: 'Chat WhatsApp', hidden: !canUseWhatsApp.value },
    { value: 'email' as const, label: 'Email', hidden: !auth.can('email.read') },
  ].filter((tab) => !tab.hidden),
)
const middleTab = ref<MiddleTab>('timeline')
const documentVisible = useDocumentVisible()
const conversationQuery = useEntityConversationQuery(
  computed(() => 'contact' as const),
  contactId,
  { enabled: canUseWhatsApp, visible: documentVisible },
)
useWhatsAppStream(canUseWhatsApp)
const whatsappUnread = computed(() => conversationQuery.data.value?.unread_count ?? 0)

const canSendEmail = computed(() => auth.can('email.send'))
const emailCompose = useEmailCompose()

function composeEmail() {
  if (!contact.value?.email) return
  emailCompose.open({
    to: [contact.value.email],
    relatedEntityType: 'contact',
    relatedEntityId: contact.value.id,
  })
}

const timelineRef = ref<InstanceType<typeof EntityTimeline> | null>(null)

function openComposer(kind: 'note' | 'log' | 'followup') {
  middleTab.value = 'timeline'
  timelineRef.value?.openComposer(kind)
}

// --- Info contact & address (panel kiri) ---
const infoTab = ref<'info' | 'address'>('info')

const addressFields: { key: keyof LeadAddress; label: string }[] = [
  { key: 'street', label: 'Alamat' },
  { key: 'city', label: 'Kota' },
  { key: 'state', label: 'Provinsi' },
  { key: 'postal_code', label: 'Kode pos' },
  { key: 'country', label: 'Negara' },
]

function addressValue(key: keyof LeadAddress) {
  const value = contact.value?.address?.[key]
  return typeof value === 'string' && value ? value : '-'
}

const infoRows = computed(() => {
  if (!contact.value) return []
  return [
    { label: 'Email', value: contact.value.email },
    { label: 'Telepon', value: contact.value.phone },
    { label: 'Company', value: company.value?.name },
    { label: 'Job title', value: contact.value.job_title },
    { label: 'Contact owner', value: ownerName.value },
    { label: 'Sumber', value: contact.value.source },
    { label: 'Tags', value: contact.value.tags?.join(', ') },
    { label: 'Dibuat', value: formatDate(contact.value.created_at) },
    { label: 'Update terakhir', value: formatDate(contact.value.updated_at) },
  ]
})

const inputClass =
  'mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'

const isEditing = ref(false)
const editError = ref('')
const editForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company_id: '',
  job_title: '',
  owner_user_id: '',
  source: '',
  lifecycle_stage: 'contact' as ContactLifecycleStage,
  address: {} as LeadAddress,
})

function startEdit() {
  if (!contact.value) return
  const address = contact.value.address ?? {}
  Object.assign(editForm, {
    first_name: contact.value.first_name,
    last_name: contact.value.last_name ?? '',
    email: contact.value.email ?? '',
    phone: contact.value.phone ?? '',
    company_id: contact.value.company_id ?? '',
    job_title: contact.value.job_title ?? '',
    owner_user_id: contact.value.owner_user_id ?? '',
    source: contact.value.source ?? '',
    lifecycle_stage: contact.value.lifecycle_stage,
    address: Object.fromEntries(
      addressFields.map(({ key }) => [key, typeof address[key] === 'string' ? address[key] : '']),
    ) as LeadAddress,
  })
  editError.value = ''
  isEditing.value = true
}

async function saveEdit() {
  if (!contact.value) return
  editError.value = ''
  if (!editForm.first_name.trim()) {
    editError.value = 'Nama depan wajib diisi.'
    return
  }
  const payload: Partial<ContactPayload> = {
    first_name: editForm.first_name.trim(),
    last_name: editForm.last_name.trim(),
    email: editForm.email.trim(),
    phone: editForm.phone.trim(),
    company_id: editForm.company_id,
    job_title: editForm.job_title.trim(),
    owner_user_id: editForm.owner_user_id,
    source: editForm.source.trim(),
    lifecycle_stage: editForm.lifecycle_stage,
    // Sama dengan form di ContactsPage: status customer mengikuti lifecycle.
    is_customer: editForm.lifecycle_stage === 'customer',
    address: compactAddress(editForm.address) as Record<string, string>,
  }
  try {
    await updateMutation.mutateAsync({ id: contact.value.id, payload })
    isEditing.value = false
  } catch (error) {
    editError.value = extractError(error)
  }
}

// --- Attachment (panel kanan) ---
const attachmentsQuery = useContactAttachmentsQuery(contactId)
const attachments = computed(() => attachmentsQuery.data.value ?? [])
const uploadMutation = useUploadContactAttachmentMutation()
const deleteAttachmentMutation = useDeleteContactAttachmentMutation()
const attachmentError = ref('')

async function uploadAttachment(file: File) {
  attachmentError.value = ''
  try {
    await uploadMutation.mutateAsync({ id: contactId.value, file })
  } catch (error) {
    attachmentError.value = extractError(error)
  }
}

async function downloadAttachment(attachment: AttachmentItem) {
  attachmentError.value = ''
  try {
    const url = await contactsApi.attachmentDownloadUrl(contactId.value, attachment.id)
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
      id: contactId.value,
      attachmentId: attachment.id,
    })
  } catch (error) {
    attachmentError.value = extractError(error)
  }
}
</script>

<template>
  <div>
    <div v-if="contactQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </div>
    <div v-else-if="contactQuery.isError.value || !contact" class="p-12 text-center">
      <p class="font-semibold text-red-700">Contact tidak ditemukan.</p>
      <button class="mt-2 text-sm font-medium text-brand-600" @click="router.push(listPath)">
        Kembali ke daftar contact
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
          Back to contacts
        </button>

        <div class="text-center">
          <div
            class="mx-auto grid size-20 place-items-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700"
          >
            {{ initials(fullName) }}
          </div>
          <h1 class="mt-3 text-lg font-bold">{{ fullName }}</h1>
          <p v-if="contact.job_title || company" class="text-sm text-gray-500">
            {{ [contact.job_title, company?.name].filter(Boolean).join(' · ') }}
          </p>
          <div class="mt-2 flex justify-center gap-2">
            <span
              class="rounded-full px-2.5 py-1 text-xs font-medium"
              :class="
                contact.is_customer ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
              "
            >
              {{ lifecycleLabels[contact.lifecycle_stage] }}
            </span>
            <span
              v-if="isDeleted"
              class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
            >
              Dihapus
            </span>
          </div>
        </div>

        <div class="flex justify-center gap-4 text-xs text-gray-600">
          <button
            v-if="!isDeleted"
            class="grid justify-items-center gap-1"
            aria-label="Log aktivitas"
            @click="openComposer('log')"
          >
            <span class="grid size-10 place-items-center rounded-full border"
              ><Plus class="size-4"
            /></span>
            Log
          </button>
          <button
            v-if="contact.email && canSendEmail"
            type="button"
            class="grid justify-items-center gap-1"
            @click="composeEmail"
          >
            <span class="grid size-10 place-items-center rounded-full border"
              ><Mail class="size-4"
            /></span>
            Email
          </button>
          <a
            v-else-if="contact.email"
            :href="`mailto:${contact.email}`"
            class="grid justify-items-center gap-1"
          >
            <span class="grid size-10 place-items-center rounded-full border"
              ><Mail class="size-4"
            /></span>
            Email
          </a>
          <a
            v-if="contact.phone"
            :href="`tel:${contact.phone}`"
            class="grid justify-items-center gap-1"
          >
            <span class="grid size-10 place-items-center rounded-full border"
              ><Phone class="size-4"
            /></span>
            Call
          </a>
        </div>

        <div class="border-t pt-2">
          <div class="flex items-center border-b text-sm">
            <button
              v-for="tab in [
                { value: 'info', label: 'Contact info' },
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
                <span class="text-xs text-gray-500">Nama depan</span>
                <input v-model="editForm.first_name" :class="inputClass" required />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Nama belakang</span>
                <input v-model="editForm.last_name" :class="inputClass" />
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
                <span class="text-xs text-gray-500">Company</span>
                <select v-model="editForm.company_id" :class="inputClass">
                  <option value="">Tanpa company</option>
                  <option v-for="item in companies" :key="item.id" :value="item.id">
                    {{ item.name }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Job title</span>
                <input v-model="editForm.job_title" :class="inputClass" />
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Contact owner</span>
                <select v-model="editForm.owner_user_id" :class="inputClass">
                  <option value="">Tanpa owner</option>
                  <option v-for="member in members" :key="member.user_id" :value="member.user_id">
                    {{ member.name }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Lifecycle</span>
                <select v-model="editForm.lifecycle_stage" :class="inputClass">
                  <option v-for="(label, value) in lifecycleLabels" :key="value" :value="value">
                    {{ label }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-xs text-gray-500">Sumber</span>
                <input v-model="editForm.source" :class="inputClass" />
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
            <div v-if="!isDeleted" class="flex justify-end pt-2">
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
            </dl>
            <dl v-else class="space-y-3 pt-2 text-sm">
              <div v-for="field in addressFields" :key="field.key">
                <dt class="text-xs text-gray-500">{{ field.label }}</dt>
                <dd class="break-words">{{ addressValue(field.key) }}</dd>
              </div>
            </dl>
          </template>
        </div>
      </BaseCard>

      <!-- Panel tengah: timeline | chat WhatsApp | email -->
      <BaseCard class="space-y-4 !p-5">
        <div
          role="tablist"
          aria-label="Panel contact"
          class="flex gap-1 border-b dark:border-gray-800"
        >
          <button
            v-for="tab in middleTabs"
            :id="`contact-tab-${tab.value}`"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="middleTab === tab.value"
            :aria-controls="`contact-panel-${tab.value}`"
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
          id="contact-panel-whatsapp"
          role="tabpanel"
          aria-labelledby="contact-tab-whatsapp"
          class="flex h-[calc(100dvh-16rem)] min-h-[30rem] flex-col"
        >
          <ConversationPanel
            related-entity-type="contact"
            :related-entity-id="contactId"
            :phone="contact.phone"
            :entity-name="fullName"
            :active="middleTab === 'whatsapp'"
            @edit-phone="startEdit"
          />
        </div>

        <div
          v-if="middleTab === 'email'"
          id="contact-panel-email"
          role="tabpanel"
          aria-labelledby="contact-tab-email"
        >
          <EntityEmailPanel
            :email="contact.email"
            entity-type="contact"
            :entity-id="contactId"
            :entity-name="fullName"
          />
        </div>

        <div
          v-show="middleTab === 'timeline'"
          id="contact-panel-timeline"
          role="tabpanel"
          aria-labelledby="contact-tab-timeline"
        >
          <EntityTimeline
            ref="timelineRef"
            related-entity-type="contact"
            :related-entity-id="contactId"
            :readonly="isDeleted"
          />
        </div>
      </BaseCard>

      <!-- Panel kanan: company, lead asal, deals, attachment -->
      <div class="space-y-4">
        <BaseCard class="space-y-3 !p-5">
          <h2 class="font-semibold">Company</h2>
          <div class="flex items-center gap-3">
            <span class="grid size-10 place-items-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Building2 class="size-5 text-gray-500" />
            </span>
            <div class="min-w-0">
              <p class="truncate font-medium">{{ company?.name || '-' }}</p>
              <p v-if="company?.website" class="truncate text-xs text-gray-500">
                {{ company.website }}
              </p>
            </div>
          </div>
          <div
            v-if="company?.email || company?.phone"
            class="space-y-2 rounded-xl border p-3 text-sm"
          >
            <p v-if="company?.email" class="flex items-center gap-2 break-all">
              <Mail class="size-4 shrink-0 text-gray-400" />{{ company.email }}
            </p>
            <p v-if="company?.phone" class="flex items-center gap-2">
              <Phone class="size-4 shrink-0 text-gray-400" />{{ company.phone }}
            </p>
          </div>
        </BaseCard>

        <BaseCard v-if="auth.can('lead.read')" class="space-y-3 !p-5">
          <h2 class="font-semibold">Lead asal</h2>
          <p v-if="leadsQuery.isPending.value" class="text-sm text-gray-500">Memuat...</p>
          <p v-else-if="!sourceLeads.length" class="text-sm text-gray-500">
            Contact ini tidak berasal dari konversi lead.
          </p>
          <ul v-else class="space-y-2">
            <li v-for="lead in sourceLeads" :key="lead.id">
              <RouterLink
                :to="`${crmBasePath}/leads/${lead.id}`"
                class="block rounded-xl border p-3 hover:border-brand-300"
              >
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <Target class="size-3.5" />
                  <span v-if="lead.source">{{ lead.source }}</span>
                  <span v-if="lead.converted_at">
                    · Converted {{ formatDate(lead.converted_at) }}
                  </span>
                </div>
                <p class="mt-1 font-medium">{{ lead.contact_name }}</p>
              </RouterLink>
            </li>
          </ul>
        </BaseCard>

        <BaseCard v-if="auth.can('deal.read')" class="space-y-3 !p-5">
          <h2 class="font-semibold">Deals</h2>
          <p v-if="dealsQuery.isPending.value" class="text-sm text-gray-500">Memuat...</p>
          <p v-else-if="!deals.length" class="text-sm text-gray-500">
            Belum ada deal untuk contact ini.
          </p>
          <ul v-else class="space-y-2">
            <li v-for="deal in deals" :key="deal.id" class="rounded-xl border p-3">
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
            </li>
          </ul>
        </BaseCard>

        <AttachmentCard
          :attachments="attachments"
          :loading="attachmentsQuery.isPending.value"
          :uploading="uploadMutation.isPending.value"
          :deleting="deleteAttachmentMutation.isPending.value"
          :readonly="isDeleted"
          :error="attachmentError"
          @upload="uploadAttachment"
          @download="downloadAttachment"
          @remove="removeAttachment"
        />
      </div>
    </div>
  </div>
</template>
