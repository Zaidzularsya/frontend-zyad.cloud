<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Mail, Phone } from 'lucide-vue-next'

import { formatDate } from '@/lib/utils'
import type { User } from '@/types/user'

const props = defineProps<{ users: User[] }>()

const emit = defineEmits<{
  view: [id: string]
}>()

function statusClasses(status: User['status']) {
  if (status === 'active')
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
  if (status === 'suspended')
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
  if (status === 'banned') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
  if (status === 'deleted') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
}

function displayRoles(user: User) {
  return user.roles.length ? user.roles.join(', ') : '-'
}

function primaryRole(user: User) {
  return user.roles[0] || 'No role'
}

const hasRows = computed(() => props.users.length > 0)
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm">
      <thead
        class="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950"
      >
        <tr>
          <th class="px-5 py-3.5 font-semibold">Pengguna</th>
          <th class="px-5 py-3.5 font-semibold">Identitas</th>
          <th class="px-5 py-3.5 font-semibold">Role</th>
          <th class="px-5 py-3.5 font-semibold">Status</th>
          <th class="px-5 py-3.5 font-semibold">Login terakhir</th>
          <th class="px-5 py-3.5 font-semibold text-right">Detail</th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr
          v-for="user in props.users"
          :key="user.id"
          class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
          @click="emit('view', user.id)"
        >
          <td class="px-5 py-4 text-gray-600 dark:text-gray-300">
            <div class="flex items-center gap-3">
              <span
                class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-100"
              >
                {{ user.name.charAt(0).toUpperCase() }}
              </span>
              <div class="min-w-0">
                <p class="truncate font-semibold text-gray-900 dark:text-white">{{ user.name }}</p>
                <p class="truncate text-xs text-gray-500">{{ user.username || user.email }}</p>
              </div>
            </div>
          </td>
          <td class="px-5 py-4 text-gray-600 dark:text-gray-300">
            <div class="space-y-1">
              <p class="flex items-center gap-1.5 text-sm">
                <Mail class="size-3.5 text-gray-400" /> {{ user.email }}
              </p>
              <p v-if="user.phone" class="flex items-center gap-1.5 text-sm text-gray-500">
                <Phone class="size-3.5 text-gray-400" /> {{ user.phone }}
              </p>
            </div>
          </td>
          <td class="px-5 py-4 text-gray-600 dark:text-gray-300">
            <div class="space-y-1">
              <p class="text-sm font-medium">{{ primaryRole(user) }}</p>
              <p class="text-xs text-gray-500">{{ displayRoles(user) }}</p>
            </div>
          </td>
          <td class="px-5 py-4 text-gray-600 dark:text-gray-300">
            <span
              :class="['rounded-full px-2.5 py-1 text-xs font-medium', statusClasses(user.status)]"
            >
              {{ user.status }}
            </span>
          </td>
          <td class="px-5 py-4 text-gray-600 dark:text-gray-300">
            {{ user.last_login_at ? formatDate(user.last_login_at) : '-' }}
          </td>
          <td class="px-5 py-4 text-right text-gray-600 dark:text-gray-300">
            <button
              class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              @click.stop="emit('view', user.id)"
            >
              Detail
              <ChevronRight class="size-4" />
            </button>
          </td>
        </tr>
        <tr v-if="!hasRows">
          <td colspan="6" class="px-5 py-12 text-center text-gray-500">Belum ada pengguna.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
