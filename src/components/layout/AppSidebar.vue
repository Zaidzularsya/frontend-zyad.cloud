<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronDown, ChevronRight, UserCircle2, X } from 'lucide-vue-next'

import { platformMenuGroups, customerMenuGroups } from '@/config/menu'
import type { MenuChildItem, MenuItem } from '@/config/menu'
import {
  getLandingMenuToneClasses,
  type LandingMenuTone,
} from '@/features/landing-management/landing-menu'
import { hasPermission } from '@/lib/permission'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'
import { useRoute } from 'vue-router'

const app = useAppStore()
const auth = useAuthStore()
const tenant = useTenantStore()
const route = useRoute()
const openMenus = ref(new Set<string>(['Landing Page']))

function hasChildren(
  item: MenuItem | MenuChildItem,
): item is MenuItem & { children: MenuChildItem[] } {
  return Array.isArray(item.children) && item.children.length > 0
}

const visibleGroups = computed(() => {
  const groups = route.path.startsWith('/platform') ? platformMenuGroups : customerMenuGroups
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) =>
          hasChildren(item)
            ? {
                ...item,
                children: item.children.filter(
                  (child) =>
                    !child.permission ||
                    hasPermission(auth.user?.permissions ?? [], child.permission),
                ),
              }
            : item,
        )
        .filter((item) => {
          const canView =
            !item.permission || hasPermission(auth.user?.permissions ?? [], item.permission)
          return canView && (item.route || hasChildren(item))
        }),
    }))
    .filter((group) => group.items.length)
})

function itemKey(item: MenuItem | MenuChildItem, parentKey = '') {
  return parentKey ? `${parentKey}/${item.label}` : item.label
}

function iconToneClass(tone?: string) {
  if (!tone) return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300'
  return getLandingMenuToneClasses(tone as LandingMenuTone)
}

function isOpen(key: string) {
  return openMenus.value.has(key)
}

function toggleMenu(key: string) {
  const nextOpenMenus = new Set(openMenus.value)
  if (nextOpenMenus.has(key)) {
    nextOpenMenus.delete(key)
  } else {
    nextOpenMenus.add(key)
  }
  openMenus.value = nextOpenMenus
}

function isActive(item: MenuItem | MenuChildItem): boolean {
  return (
    item.route === route.name ||
    (hasChildren(item) && item.children.some((child) => child.route === route.name))
  )
}

function closeMobileSidebar() {
  app.sidebarOpen = false
}
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
          <div v-for="item in group.items" :key="item.label">
            <button
              v-if="item.children?.length"
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              :class="
                isActive(item) ? 'bg-gray-100 text-gray-950 dark:bg-gray-900 dark:text-white' : ''
              "
              @click="toggleMenu(itemKey(item))"
            >
              <component :is="item.icon" class="size-5 shrink-0" />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <ChevronDown
                class="size-4 shrink-0 text-gray-400 transition-transform"
                :class="isOpen(itemKey(item)) ? 'rotate-180' : ''"
              />
            </button>
            <RouterLink
              v-else-if="item.route"
              :to="{ name: item.route }"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              active-class="!bg-brand-50 !text-brand-600 dark:!bg-brand-950"
              @click="closeMobileSidebar"
            >
              <component :is="item.icon" class="size-5 shrink-0" />
              <span class="min-w-0 truncate">{{ item.label }}</span>
            </RouterLink>

            <div
              v-if="item.children?.length && isOpen(itemKey(item))"
              class="mt-2 space-y-2 border-l border-gray-100 pl-4 dark:border-gray-800"
            >
              <div v-for="child in item.children" :key="itemKey(child, itemKey(item))">
                <RouterLink
                  v-if="child.route"
                  :to="{ name: child.route }"
                  class="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/80"
                  active-class="!border-brand-200 !bg-brand-50 !text-brand-700 dark:!border-brand-900 dark:!bg-brand-950 dark:!text-brand-200"
                  @click="closeMobileSidebar"
                >
                  <span
                    class="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                    :class="iconToneClass(child.tone)"
                  >
                    <component :is="child.icon || item.icon" class="size-4" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate">{{ child.label }}</span>
                    <span class="block truncate text-xs text-gray-400">
                      {{ child.description || 'Open page' }}
                    </span>
                  </span>
                  <ChevronRight
                    class="size-4 shrink-0 text-gray-300 transition group-hover:text-gray-500"
                  />
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </nav>

    <div class="border-t p-4 pt-5">
      <RouterLink
        :to="{ name: 'profile' }"
        class="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
        active-class="!bg-brand-50 !text-brand-600 dark:!bg-brand-950"
        @click="closeMobileSidebar"
      >
        <UserCircle2 class="size-5" />
        Profile
      </RouterLink>
    </div>
  </aside>
</template>
