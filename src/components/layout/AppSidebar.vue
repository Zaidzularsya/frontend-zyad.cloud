<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronDown, FileText, Landmark, ShieldQuestion, UserCircle2, X } from 'lucide-vue-next'

import { platformMenuGroups, customerMenuGroups } from '@/config/menu'
import type { MenuChildItem, MenuItem } from '@/config/menu'
import type { LandingMenuTone } from '@/features/landing/builder/config/landing-menu'
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

const isPlatformMode = computed(() => route.path.startsWith('/platform'))

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

const toneTextClasses: Record<LandingMenuTone, string> = {
  sky: 'text-sky-500 dark:text-sky-400',
  violet: 'text-violet-500 dark:text-violet-400',
  emerald: 'text-emerald-500 dark:text-emerald-400',
  amber: 'text-amber-500 dark:text-amber-400',
  rose: 'text-rose-500 dark:text-rose-400',
  cyan: 'text-cyan-500 dark:text-cyan-400',
  slate: 'text-slate-500 dark:text-slate-400',
}

function iconToneClass(tone?: string) {
  if (!tone) return 'text-gray-400 dark:text-gray-500'
  return toneTextClasses[tone as LandingMenuTone]
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
    :class="[
      app.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      isPlatformMode ? 'border-t-4 border-t-indigo-500' : '',
    ]"
  >
    <div class="flex h-18 items-center justify-between border-b px-5">
      <RouterLink
        :to="{ name: isPlatformMode ? 'platform-dashboard' : 'profile' }"
        class="flex items-center gap-3"
      >
        <span
          v-if="isPlatformMode"
          class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#00003c]"
        >
          <svg
            viewBox="0 0 540 270"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-auto"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sidebarBrandMarkLeft" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#7DD3FC" />
                <stop offset="100%" stop-color="#2563EB" />
              </linearGradient>
              <linearGradient id="sidebarBrandMarkCenter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#5EEAD4" />
                <stop offset="100%" stop-color="#22D3EE" />
              </linearGradient>
              <linearGradient id="sidebarBrandMarkRight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#BAE6FD" />
                <stop offset="100%" stop-color="#2DD4BF" />
              </linearGradient>
              <linearGradient id="sidebarBrandMarkDot" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#67E8F9" />
                <stop offset="100%" stop-color="#5EEAD4" />
              </linearGradient>
            </defs>
            <path
              d="M 50 240 L 210 240 A 20 20 0 0 0 230 220 L 230 215 A 100 100 0 0 0 30 215 L 30 220 A 20 20 0 0 0 50 240 Z"
              fill="url(#sidebarBrandMarkLeft)"
            />
            <path
              d="M 170 240 L 390 240 A 20 20 0 0 0 410 220 L 410 170 A 130 130 0 0 0 150 170 L 150 220 A 20 20 0 0 0 170 240 Z"
              fill="url(#sidebarBrandMarkCenter)"
            />
            <path
              d="M 351 240 L 489 240 A 16 16 0 0 0 505 224 L 505 215 A 85 85 0 0 0 335 215 L 335 224 A 16 16 0 0 0 351 240 Z"
              fill="url(#sidebarBrandMarkRight)"
            />
            <circle cx="445" cy="85" r="26" fill="url(#sidebarBrandMarkDot)" />
          </svg>
        </span>
        <span
          v-else
          class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-lg font-bold text-white"
        >
          {{ (tenant.activeTenant?.name || 'Zyad').charAt(0).toUpperCase() }}
        </span>
        <div class="min-w-0">
          <strong class="block truncate text-lg leading-5">{{
            isPlatformMode ? 'Zyad Cloud' : tenant.activeTenant?.name || 'Zyad Cloud'
          }}</strong>
          <small
            class="font-semibold uppercase tracking-wide"
            :class="isPlatformMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'"
          >
            {{ isPlatformMode ? 'Super Admin Console' : 'Workspace Console' }}
          </small>
        </div>
      </RouterLink>
      <button
        class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-900 lg:hidden"
        @click="app.sidebarOpen = false"
      >
        <X class="size-5" />
      </button>
    </div>

    <nav class="scrollbar-soft flex-1 space-y-6 overflow-y-auto px-4 py-5 pb-6">
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
              :active-class="
                isPlatformMode
                  ? '!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-950/50'
                  : '!bg-brand-50 !text-brand-600 dark:!bg-brand-950'
              "
              @click="closeMobileSidebar"
            >
              <component :is="item.icon" class="size-5 shrink-0" />
              <span class="min-w-0 truncate">{{ item.label }}</span>
            </RouterLink>

            <div
              v-if="item.children?.length && isOpen(itemKey(item))"
              class="mt-1 space-y-0.5 border-l border-gray-100 pl-4 dark:border-gray-800"
            >
              <template v-for="child in item.children" :key="itemKey(child, itemKey(item))">
                <RouterLink
                  v-if="child.route"
                  :to="{ name: child.route }"
                  class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                  :active-class="
                    isPlatformMode
                      ? '!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-950/50'
                      : '!bg-brand-50 !text-brand-600 dark:!bg-brand-950'
                  "
                  @click="closeMobileSidebar"
                >
                  <component
                    :is="child.icon || item.icon"
                    class="size-4 shrink-0"
                    :class="iconToneClass(child.tone)"
                  />
                  <span class="min-w-0 flex-1 truncate">{{ child.label }}</span>
                </RouterLink>
              </template>
            </div>
          </div>
        </div>
      </section>
    </nav>

    <div class="border-t p-4 pt-5">
      <template v-if="isPlatformMode">
        <div v-if="isOpen('account')" class="mb-2 space-y-1">
          <RouterLink
            :to="{ name: 'platform-profile' }"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            active-class="!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-950/50"
            @click="closeMobileSidebar"
          >
            <UserCircle2 class="size-4 shrink-0" />
            Profile
          </RouterLink>
          <RouterLink
            :to="{ name: 'platform-bank' }"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            active-class="!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-950/50"
            @click="closeMobileSidebar"
          >
            <Landmark class="size-4 shrink-0" />
            Bank
          </RouterLink>
          <RouterLink
            :to="{ name: 'legal-privacy' }"
            target="_blank"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
          >
            <ShieldQuestion class="size-4 shrink-0" />
            Privacy Policy
          </RouterLink>
          <RouterLink
            :to="{ name: 'legal-terms' }"
            target="_blank"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
          >
            <FileText class="size-4 shrink-0" />
            Terms and Conditions
          </RouterLink>
        </div>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
          @click="toggleMenu('account')"
        >
          <UserCircle2 class="size-5" />
          <span class="flex-1 text-left">Platform</span>
          <ChevronDown
            class="size-4 shrink-0 text-gray-400 transition-transform"
            :class="isOpen('account') ? 'rotate-180' : ''"
          />
        </button>
      </template>
      <template v-else>
        <div v-if="isOpen('account')" class="mb-2 space-y-1">
          <RouterLink
            :to="{ name: 'profile' }"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            active-class="!bg-brand-50 !text-brand-600 dark:!bg-brand-950"
            @click="closeMobileSidebar"
          >
            <UserCircle2 class="size-4 shrink-0" />
            Profile
          </RouterLink>
          <RouterLink
            :to="{ name: 'account-bank' }"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            active-class="!bg-brand-50 !text-brand-600 dark:!bg-brand-950"
            @click="closeMobileSidebar"
          >
            <Landmark class="size-4 shrink-0" />
            Bank
          </RouterLink>
        </div>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
          @click="toggleMenu('account')"
        >
          <UserCircle2 class="size-5" />
          <span class="flex-1 text-left">Account</span>
          <ChevronDown
            class="size-4 shrink-0 text-gray-400 transition-transform"
            :class="isOpen('account') ? 'rotate-180' : ''"
          />
        </button>
      </template>
    </div>
  </aside>
</template>
