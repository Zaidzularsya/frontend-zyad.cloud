<script setup lang="ts">
import { computed, ref } from 'vue'

import DataPagination from '@/components/ui/DataPagination.vue'
import { useActivityQuery } from '@/features/mikrotik/api/mikrotik.queries'

const page = ref(1)
const perPage = ref(20)
const params = computed(() => ({ limit: perPage.value, offset: (page.value - 1) * perPage.value }))
const query = useActivityQuery(params)
const items = computed(() => query.data.value?.data ?? [])
const total = computed(() => query.data.value?.meta?.total ?? 0)

function fmt(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}
</script>

<template>
  <section class="space-y-3" aria-labelledby="activity-heading">
    <h2 id="activity-heading" class="text-lg font-semibold">Log aktivitas</h2>
    <p v-if="query.isPending.value" class="text-sm text-gray-600" role="status">Memuat log...</p>
    <p v-else-if="query.isError.value" class="text-sm text-red-700" role="alert">
      Gagal memuat log aktivitas.
      <button type="button" class="font-medium underline" @click="query.refetch()">
        Coba lagi
      </button>
    </p>
    <p v-else-if="items.length === 0" class="rounded-xl border p-6 text-sm text-gray-600">
      Belum ada aktivitas.
    </p>
    <div v-else class="rounded-xl border">
      <ul class="divide-y">
        <li v-for="item in items" :key="item.id" class="space-y-0.5 px-4 py-3 text-sm">
          <p>{{ item.message }}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">
            <time :datetime="item.at">{{ fmt(item.at) }} WIB</time>
            <span v-if="item.account_name"> - {{ item.account_name }}</span>
          </p>
        </li>
      </ul>
      <DataPagination
        :page="page"
        :per-page="perPage"
        :total="total"
        item-label="aktivitas"
        @update:page="page = $event"
        @update:per-page="perPage = $event"
      />
    </div>
  </section>
</template>
