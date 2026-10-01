<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Building2, User } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import DealStageTrack from '@/features/crm/components/DealStageTrack.vue'
import EntityTimeline from '@/features/crm/components/EntityTimeline.vue'
import { useCompanyQuery } from '@/features/crm/companies/api/companies.queries'
import { useContactQuery } from '@/features/crm/contacts/api/contacts.queries'
import {
  useCloseDealLostMutation,
  useCloseDealWonMutation,
  useDealQuery,
  useMoveDealStageMutation,
} from '@/features/crm/deals/api/deals.queries'
import EntityEmailPanel from '@/features/email/components/EntityEmailPanel.vue'
import ConversationPanel from '@/features/whatsapp/components/ConversationPanel.vue'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const dealId = computed(() => String(route.params.id ?? ''))
const dealQuery = useDealQuery(dealId)
const deal = computed(() => dealQuery.data.value)
// useContactQuery menerima Ref<string> dan nonaktif bila kosong.
const contactQuery = useContactQuery(computed(() => deal.value?.contact_id ?? ''))
const companyQuery = useCompanyQuery(computed(() => deal.value?.company_id ?? undefined))
const contact = computed(() => contactQuery.data.value)
const company = computed(() => companyQuery.data.value)
const contactName = computed(() =>
  contact.value
    ? [contact.value.first_name, contact.value.last_name].filter(Boolean).join(' ')
    : '',
)

const base = computed(() => route.path.replace(/deals\/[^/]+$/, ''))
const moveStage = useMoveDealStageMutation()
const closeWon = useCloseDealWonMutation()
const closeLost = useCloseDealLostMutation()
const actionError = ref('')
const canMove = computed(() => auth.can('deal.move_stage') && deal.value?.status === 'open')

async function onSelectStage(stageId: string) {
  if (!deal.value || stageId === deal.value.stage_id) return
  const name = deal.value.pipeline.stages.find((s) => s.id === stageId)?.name ?? ''
  if (!confirm(`Pindahkan deal ke stage "${name}"?`)) return
  try {
    await moveStage.mutateAsync({ id: deal.value.id, stageId })
  } catch {
    actionError.value = 'Stage gagal dipindah.'
  }
}

async function markWon() {
  if (!deal.value || !confirm(`Tandai deal "${deal.value.title}" sebagai Won?`)) return
  await closeWon.mutateAsync(deal.value.id)
}

async function markLost() {
  if (!deal.value) return
  const reason = prompt('Alasan deal lost (opsional):') ?? undefined
  await closeLost.mutateAsync({ id: deal.value.id, lostReason: reason })
}

type Tab = 'timeline' | 'whatsapp' | 'email'
const tab = ref<Tab>('timeline')
const tabs = computed(() =>
  [
    { value: 'timeline' as const, label: 'Timeline', show: true },
    {
      value: 'whatsapp' as const,
      label: 'Chat WhatsApp',
      show: Boolean(contact.value) && auth.can('whatsapp.conversation.read'),
    },
    {
      value: 'email' as const,
      label: 'Email',
      show: Boolean(contact.value) && auth.can('email.read'),
    },
  ].filter((t) => t.show),
)
const closeDate = computed(() =>
  deal.value?.expected_close_date
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(deal.value.expected_close_date),
      )
    : '-',
)
</script>

<template>
  <div>
    <p v-if="dealQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </p>
    <div v-else-if="dealQuery.isError.value || !deal" class="p-12 text-center">
      <p class="font-semibold text-red-700">Deal tidak ditemukan.</p>
      <button class="mt-2 text-sm font-medium text-brand-600" @click="router.push(`${base}deals`)">
        Kembali ke deals
      </button>
    </div>

    <div v-else class="space-y-4">
      <BaseCard class="space-y-4 !p-5">
        <button
          class="inline-flex items-center gap-2 text-sm text-gray-600"
          @click="router.push(`${base}deals`)"
        >
          <ArrowLeft class="size-4" /> Kembali ke deals
        </button>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-bold">{{ deal.title }}</h1>
            <p class="text-2xl font-semibold">
              {{ formatCurrency(Number(deal.value), deal.currency) }}
            </p>
            <p class="text-xs text-gray-500">{{ deal.pipeline.name }} · status {{ deal.status }}</p>
          </div>
          <div v-if="deal.status === 'open'" class="flex gap-2">
            <BaseButton v-if="auth.can('deal.close_won')" @click="markWon">Won</BaseButton>
            <BaseButton v-if="auth.can('deal.close_lost')" variant="secondary" @click="markLost"
              >Lost</BaseButton
            >
          </div>
        </div>
        <DealStageTrack
          :stages="deal.pipeline.stages"
          :current-stage-id="deal.stage_id"
          :deal-status="deal.status"
          :clickable="canMove"
          @select="onSelectStage"
        />
        <p v-if="actionError" class="text-sm text-red-600" role="alert">{{ actionError }}</p>
      </BaseCard>

      <div class="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <BaseCard class="space-y-4 !p-5 text-sm">
          <section class="space-y-2">
            <h2 class="font-semibold">Kontak</h2>
            <RouterLink
              v-if="contact"
              :to="`${base}contacts/${contact.id}`"
              class="flex items-center gap-2 text-brand-600"
            >
              <User class="size-4" /> {{ contactName }}
            </RouterLink>
            <p v-else class="text-gray-500">-</p>
            <p v-if="company" class="flex items-center gap-2">
              <Building2 class="size-4 text-gray-400" /> {{ company.name }}
            </p>
          </section>
          <section class="space-y-1 rounded-xl border p-3">
            <h2 class="font-semibold">Kebutuhan</h2>
            <p class="whitespace-pre-line">{{ deal.description || 'Belum diisi.' }}</p>
            <p class="text-xs text-gray-500">
              Pengambil keputusan: {{ deal.decision_maker || '-' }}
            </p>
            <p class="text-xs text-gray-500">Target closing: {{ closeDate }}</p>
          </section>
          <p v-if="deal.source_lead" class="text-xs text-gray-500">
            Asal:
            <RouterLink :to="`${base}leads/${deal.source_lead.id}`" class="text-brand-600"
              >Lead {{ deal.source_lead.contact_name }}</RouterLink
            >
          </p>
        </BaseCard>

        <BaseCard class="!p-5">
          <div role="tablist" class="mb-4 flex gap-4 border-b text-sm">
            <button
              v-for="t in tabs"
              :key="t.value"
              role="tab"
              :aria-selected="tab === t.value"
              class="-mb-px border-b-2 pb-2"
              :class="
                tab === t.value
                  ? 'border-brand-600 font-semibold'
                  : 'border-transparent text-gray-500'
              "
              @click="tab = t.value"
            >
              {{ t.label }}
            </button>
          </div>
          <EntityTimeline
            v-if="tab === 'timeline'"
            related-entity-type="deal"
            :related-entity-id="deal.id"
            :default-assignee-id="deal.owner_user_id"
          />
          <ConversationPanel
            v-else-if="tab === 'whatsapp' && contact"
            related-entity-type="contact"
            :related-entity-id="contact.id"
            :phone="contact.phone"
            :entity-name="contactName"
            :active="tab === 'whatsapp'"
          />
          <EntityEmailPanel
            v-else-if="tab === 'email' && contact"
            :email="contact.email"
            entity-type="contact"
            :entity-id="contact.id"
            :entity-name="contactName"
          />
        </BaseCard>
      </div>
    </div>
  </div>
</template>
