<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search, Users as UsersIcon, UserCheck, UserMinus, UserX } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

import { useUsersQuery } from '@/features/users/api/users.queries'
import UsersTable from '@/features/users/components/UsersTable.vue'
const router = useRouter()

const search = ref('')
const page = ref(1)
const selectedStatusTab = ref<string>('all')

const perPage = 20

const params = computed(() => {
  const statusParam = selectedStatusTab.value === 'all' ? undefined : selectedStatusTab.value
  const includeDeleted = selectedStatusTab.value === 'deleted'

  return {
    page: page.value,
    per_page: perPage,
    search: search.value || undefined,
    status: includeDeleted ? undefined : statusParam,
    include_deleted: includeDeleted ? true : undefined,
  }
})

const usersQuery = useUsersQuery(params)

const totalUsers = computed(() => usersQuery.data.value?.meta.total ?? 0)
const totalPages = computed(() => usersQuery.data.value?.meta.total_pages ?? 1)
const currentPage = computed(() => usersQuery.data.value?.meta.page ?? page.value)
const users = computed(() => usersQuery.data.value?.data ?? [])

const stats = computed(() => {
  const items = users.value
  return {
    total: totalUsers.value,
    active: items.filter((user) => user.status === 'active').length,
    suspended: items.filter((user) => user.status === 'suspended').length,
    deleted: items.filter((user) => user.status === 'deleted').length,
  }
})

watch([search, selectedStatusTab], () => {
  page.value = 1
})

function openDetail(id: string) {
  void router.push({ name: 'user-detail', params: { id } })
}

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  page.value = nextPage
}

const statusTabs = [
  { label: 'Semua', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Undangan', value: 'invited' },
  { label: 'Ditangguhkan', value: 'suspended' },
  { label: 'Banned', value: 'banned' },
  { label: 'Terhapus', value: 'deleted' },
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Users"
      description="Kelola pengguna dengan tampilan list yang cepat, detail yang jelas, dan navigasi yang tidak mengganggu."
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <UsersIcon class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Total hasil</p>
            <p class="text-2xl font-bold">{{ stats.total }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <UserCheck class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Aktif</p>
            <p class="text-2xl font-bold">{{ stats.active }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <UserMinus class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Ditangguhkan</p>
            <p class="text-2xl font-bold">{{ stats.suspended }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-gray-100 text-gray-600">
            <UserX class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Terhapus</p>
            <p class="text-2xl font-bold">{{ stats.deleted }}</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        class="border-b-2 px-4 py-2 text-sm font-medium transition-all"
        :class="
          selectedStatusTab === tab.value
            ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        "
        @click="selectedStatusTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <BaseCard class="!p-0">
      <div class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative w-full max-w-sm">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama, email, username..."
            class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>

        <div class="flex items-center gap-3 text-sm text-gray-500">
          <span>{{ currentPage }} / {{ totalPages }} halaman</span>
          <span>•</span>
          <span>{{ totalUsers }} pengguna</span>
        </div>
      </div>

      <div
        v-if="usersQuery.isPending.value"
        class="min-h-[420px] p-12 text-center text-sm text-gray-500"
      >
        Memuat pengguna...
      </div>
      <div v-else-if="usersQuery.isError.value" class="min-h-[420px] p-12 text-center">
        <p class="font-semibold text-red-700">Data pengguna tidak dapat dimuat.</p>
        <button class="mt-2 text-sm font-medium text-brand-600" @click="usersQuery.refetch()">
          Coba lagi
        </button>
      </div>
      <div v-else class="min-h-[420px]">
        <UsersTable :users="users" @view="openDetail" />
      </div>

      <div class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-500">
          Menampilkan {{ users.length }} data pada halaman {{ currentPage }} dari {{ totalPages }}.
        </p>

        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            :disabled="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          >
            Sebelumnya
          </BaseButton>
          <div
            class="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {{ currentPage }}
          </div>
          <BaseButton
            variant="secondary"
            :disabled="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
          >
            Berikutnya
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
