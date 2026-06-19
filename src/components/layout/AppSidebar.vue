<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { UserCircle2, X } from 'lucide-vue-next'

import { platformMenuGroups, customerMenuGroups } from '@/config/menu'
import { hasPermission } from '@/lib/permission'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'
import { useRoute } from 'vue-router'

const app = useAppStore()
const auth = useAuthStore()
const tenant = useTenantStore()
const route = useRoute()

const visibleGroups = computed(() => {
  const groups = route.path.startsWith('/platform') ? platformMenuGroups : customerMenuGroups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || hasPermission(auth.user?.permissions ?? [], item.permission),
      ),
    }))
    .filter((group) => group.items.length)
})
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-white transition-transform duration-200 dark:bg-gray-950 lg:translate-x-0"
    :class="app.sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex h-18 items-center justify-between border-b px-5">
      <RouterLink :to="{ name: 'profile' }" class="flex items-center gap-3">
        <span
          class="grid size-10 place-items-center rounded-xl bg-brand-500 text-lg font-bold text-white"
        >
          {{ (tenant.activeTenant?.name || 'Zyad').charAt(0).toUpperCase() }}
        </span>
        <div class="min-w-0">
          <strong class="block truncate text-lg leading-5">{{
            tenant.activeTenant?.name || 'Zyad Cloud'
          }}</strong>
          <small class="text-gray-500">Workspace Console</small>
        </div>
      </RouterLink>
      <button
        class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-900 lg:hidden"
        @click="app.sidebarOpen = false"
      >
        <X class="size-5" />
      </button>
    </div>

    <nav class="flex-1 space-y-6 overflow-y-auto px-4 py-5 pb-6">
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

    <div class="border-t p-4 pt-5">
      <RouterLink
        :to="{ name: 'profile' }"
        class="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
        active-class="!bg-brand-50 !text-brand-600 dark:!bg-brand-950"
        @click="app.sidebarOpen = false"
      >
        <UserCircle2 class="size-5" />
        Profile
      </RouterLink>
    </div>
  </aside>
</template>
