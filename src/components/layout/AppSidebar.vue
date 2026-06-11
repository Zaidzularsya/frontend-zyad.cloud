<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Building2, X } from 'lucide-vue-next'

import { menuGroups } from '@/config/menu'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'

const app = useAppStore()
const auth = useAuthStore()
const tenant = useTenantStore()

const visibleGroups = computed(() =>
  menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || auth.can(item.permission)),
    }))
    .filter((group) => group.items.length),
)
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-white transition-transform duration-200 dark:bg-gray-950 lg:translate-x-0"
    :class="app.sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex h-18 items-center justify-between border-b px-5">
      <RouterLink :to="{ name: 'dashboard' }" class="flex items-center gap-3">
        <span
          class="grid size-10 place-items-center rounded-xl bg-brand-500 text-lg font-bold text-white"
        >
          Z
        </span>
        <span>
          <strong class="block text-lg leading-5">Zyad Cloud</strong>
          <small class="text-gray-500">CRM Workspace</small>
        </span>
      </RouterLink>
      <button
        class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-900 lg:hidden"
        @click="app.sidebarOpen = false"
      >
        <X class="size-5" />
      </button>
    </div>

    <div class="p-4">
      <RouterLink
        :to="{ name: 'select-tenant' }"
        class="flex items-center gap-3 rounded-xl border bg-gray-50 p-3 hover:border-brand-300 dark:bg-gray-900"
      >
        <span
          class="grid size-9 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900"
        >
          <Building2 class="size-5" />
        </span>
        <span class="min-w-0 flex-1">
          <small class="block text-gray-500">Workspace aktif</small>
          <strong class="block truncate text-sm">{{
            tenant.activeTenant?.name || 'Pilih workspace'
          }}</strong>
        </span>
      </RouterLink>
    </div>

    <nav class="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
      <section v-for="group in visibleGroups" :key="group.label">
        <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {{ group.label }}
        </p>
        <div class="space-y-1">
          <RouterLink
            v-for="item in group.items"
            :key="item.route"
            :to="{ name: item.route }"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            active-class="!bg-brand-50 !text-brand-600 dark:!bg-brand-950"
            @click="app.sidebarOpen = false"
          >
            <component :is="item.icon" class="size-5" />
            {{ item.label }}
          </RouterLink>
        </div>
      </section>
    </nav>
  </aside>
</template>
