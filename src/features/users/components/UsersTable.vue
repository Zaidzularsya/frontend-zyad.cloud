<script setup lang="ts">
import { computed, h } from 'vue'
import { FlexRender, getCoreRowModel, useVueTable, type ColumnDef } from '@tanstack/vue-table'

import { formatDate } from '@/lib/utils'
import type { User } from '@/types/user'

const props = defineProps<{ users: User[] }>()

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Pengguna',
    cell: ({ row }) =>
      h('div', [
        h('p', { class: 'font-semibold text-gray-900 dark:text-white' }, row.original.name),
        h('p', { class: 'text-xs text-gray-500' }, row.original.email),
      ]),
  },
  { accessorKey: 'role', header: 'Role' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) =>
      h(
        'span',
        {
          class:
            getValue() === 'active'
              ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
              : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700',
        },
        String(getValue()),
      ),
  },
  {
    accessorKey: 'lastActiveAt',
    header: 'Aktif terakhir',
    cell: ({ getValue }) => {
      const value = getValue<string | null>()
      return value ? formatDate(value) : '-'
    },
  },
]

const table = useVueTable({
  get data() {
    return props.users
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
})

const rows = computed(() => table.getRowModel().rows)
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm">
      <thead
        class="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950"
      >
        <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <th
            v-for="header in headerGroup.headers"
            :key="header.id"
            class="px-5 py-3.5 font-semibold"
          >
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr v-for="row in rows" :key="row.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <td
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            class="px-5 py-4 text-gray-600 dark:text-gray-300"
          >
            <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="px-5 py-12 text-center text-gray-500">
            Belum ada pengguna.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
