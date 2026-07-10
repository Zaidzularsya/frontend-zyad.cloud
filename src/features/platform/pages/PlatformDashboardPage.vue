<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Building, Clock, Users } from 'lucide-vue-next'

import BaseCard from '@/components/ui/BaseCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { platformOrganizationsApi } from '@/features/platform/api/organizations.api'
import { usersApi } from '@/features/users/api/users.api'

const organizationsQuery = useQuery({
  queryKey: ['platform', 'organizations', 'count'],
  queryFn: () => platformOrganizationsApi.list({ page: 1, per_page: 1 }),
})

const platformUsersQuery = useQuery({
  queryKey: ['platform', 'users', 'count'],
  queryFn: () => usersApi.list({ page: 1, per_page: 1 }),
})

const totalTenants = computed(() => organizationsQuery.data.value?.meta?.total ?? null)
const totalPlatformUsers = computed(() => platformUsersQuery.data.value?.meta?.total ?? null)

const metrics = computed(() => [
  {
    label: 'Total Tenant',
    value: totalTenants.value,
    loading: organizationsQuery.isLoading.value,
    error: organizationsQuery.isError.value,
    icon: Building,
  },
  {
    label: 'Total Platform User',
    value: totalPlatformUsers.value,
    loading: platformUsersQuery.isLoading.value,
    error: platformUsersQuery.isError.value,
    icon: Users,
  },
])
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Platform Overview"
      description="Super Admin dashboard untuk mengelola seluruh infrastruktur Zyad Cloud."
    />

    <div class="grid gap-4 md:grid-cols-3">
      <BaseCard v-for="metric in metrics" :key="metric.label">
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50"
          >
            <component :is="metric.icon" class="size-5" />
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">{{ metric.label }}</p>
        <p
          v-if="metric.loading"
          class="mt-1 h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
        />
        <p v-else-if="metric.error" class="mt-1 text-sm text-red-500">Gagal memuat</p>
        <p v-else class="mt-1 text-2xl font-bold">{{ metric.value?.toLocaleString('id-ID') }}</p>
      </BaseCard>

      <BaseCard class="border-dashed">
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800"
          >
            <Clock class="size-5" />
          </span>
          <span
            class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-800"
          >
            Segera hadir
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">Platform Revenue</p>
        <p class="mt-1 text-sm text-gray-400">
          Menunggu endpoint agregasi revenue platform di backend.
        </p>
      </BaseCard>
    </div>
  </div>
</template>
