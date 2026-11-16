<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useSecretDetailQuery } from '@/features/mikrotik/api/mikrotik.queries'
import OnboardingPanel from '@/features/mikrotik/components/OnboardingPanel.vue'
import { mappingLabel } from '@/features/mikrotik/utils/pairing'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const auth = useAuthStore()
const canPair = computed(() => auth.can('mikrotik_secret.pair'))
const id = computed(() => String(route.params.id ?? ''))
const query = useSecretDetailQuery(id)
const detail = computed(() => query.data.value)
const secret = computed(() => detail.value?.secret)

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="secret?.name ?? 'Detail secret'" description="Secret PPPoE dan onboarding.">
      <RouterLink :to="{ name: 'mikrotik-accounts' }" class="text-sm font-medium text-brand-600"
        >Kembali ke Akun PPPoE</RouterLink
      >
    </PageHeader>

    <BaseCard v-if="query.isError.value" class="flex items-center gap-3 text-sm" role="alert">
      <p class="text-red-600">Gagal memuat secret. Coba lagi.</p>
      <BaseButton variant="outline" @click="query.refetch()">Coba lagi</BaseButton>
    </BaseCard>
    <BaseCard v-else-if="!secret" class="text-sm text-gray-500" role="status"
      >Memuat secret…</BaseCard
    >

    <template v-else>
      <BaseCard>
        <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-xs text-gray-500">Status di router</dt>
            <dd>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  secret.disabled
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                "
                >{{ secret.disabled ? 'Nonaktif' : 'Aktif' }}</span
              >
              <span v-if="!secret.present" class="ml-2 text-xs text-red-600"
                >Tidak ada lagi di router</span
              >
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Status pemetaan</dt>
            <dd>{{ mappingLabel(secret) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Pelanggan</dt>
            <dd>{{ secret.account_id ? secret.account_name || 'Pelanggan terpasang' : '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Profile</dt>
            <dd>{{ secret.profile || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Profile asli</dt>
            <dd>
              {{ secret.original_profile || '-' }}
              <span v-if="secret.needs_original_profile" class="block text-xs text-red-700"
                >Perlu diisi dari halaman Akun PPPoE</span
              >
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Status isolir</dt>
            <dd>{{ secret.isolation_state === 'isolated' ? 'Terisolir' : 'Normal' }}</dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <dt class="text-xs text-gray-500">Komentar di router</dt>
            <dd class="whitespace-pre-line">{{ secret.comment || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Terakhir terlihat</dt>
            <dd>{{ formatDateTime(secret.last_seen_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">Dipasangkan</dt>
            <dd>{{ formatDateTime(secret.paired_at) }}</dd>
          </div>
        </dl>
      </BaseCard>

      <OnboardingPanel v-if="canPair && detail" :detail="detail" @done="query.refetch()" />
      <BaseCard v-else class="text-sm text-gray-500">
        Anda belum punya izin untuk onboarding pelanggan dari secret.
      </BaseCard>
    </template>
  </div>
</template>
