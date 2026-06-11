<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useUsersQuery } from '@/features/users/api/users.queries'
import UsersTable from '@/features/users/components/UsersTable.vue'

const search = ref('')
const page = ref(1)
const params = computed(() => ({
  page: page.value,
  perPage: 20,
  search: search.value || undefined,
}))
const usersQuery = useUsersQuery(params)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Users" description="Kelola anggota, role, dan akses di workspace ini.">
      <PermissionGate permission="users.create">
        <BaseButton><Plus class="size-4" /> Tambah user</BaseButton>
      </PermissionGate>
    </PageHeader>

    <BaseCard class="!p-0">
      <div class="flex items-center justify-between gap-4 border-b p-5">
        <label class="relative w-full max-w-sm">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama atau email..."
            class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>
        <span v-if="usersQuery.data.value" class="text-sm text-gray-500">
          {{ usersQuery.data.value.meta.total }} pengguna
        </span>
      </div>

      <div v-if="usersQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat pengguna...
      </div>
      <div v-else-if="usersQuery.isError.value" class="p-12 text-center">
        <p class="font-semibold text-red-700">Data pengguna tidak dapat dimuat.</p>
        <button class="mt-2 text-sm font-medium text-brand-600" @click="usersQuery.refetch()">
          Coba lagi
        </button>
      </div>
      <UsersTable v-else :users="usersQuery.data.value?.data || []" />
    </BaseCard>
  </div>
</template>
