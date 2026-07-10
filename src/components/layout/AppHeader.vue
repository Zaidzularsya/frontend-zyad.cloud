<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from 'lucide-vue-next'

import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'

const app = useAppStore()
const auth = useAuthStore()
const tenant = useTenantStore()
const router = useRouter()
const route = useRoute()

const isPlatformMode = computed(() => route.path.startsWith('/platform'))

const accountMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)
const copiedOrganizationId = ref(false)

async function logout() {
  accountMenuOpen.value = false
  await auth.logout()
  await router.replace({ name: 'login' })
}

async function copyOrganizationId() {
  const organizationId = tenant.activeTenantId
  if (!organizationId) return

  await navigator.clipboard.writeText(organizationId)
  copiedOrganizationId.value = true
  window.setTimeout(() => {
    copiedOrganizationId.value = false
  }, 1800)
}

function closeAccountMenu(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (accountMenuRef.value?.contains(target)) return
  accountMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', closeAccountMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeAccountMenu)
})
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-18 items-center gap-4 border-b bg-white/90 px-4 backdrop-blur dark:bg-gray-950/90 sm:px-6"
  >
    <button
      class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-900 lg:hidden"
      @click="app.sidebarOpen = true"
    >
      <Menu class="size-5" />
    </button>

    <label class="relative hidden max-w-md flex-1 md:block">
      <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        placeholder="Cari customer, deal, atau kontak..."
        class="w-full rounded-lg border bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-900"
      />
    </label>

    <div class="ml-auto flex items-center gap-3">
      <div
        v-if="isPlatformMode"
        class="hidden items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300 lg:flex"
      >
        <ShieldCheck class="size-3.5" />
        Platform Admin Mode
      </div>
      <div
        v-else-if="tenant.activeTenantId"
        class="hidden items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300 lg:flex"
      >
        <span class="font-semibold text-gray-500 dark:text-gray-400">Organization ID</span>
        <code class="max-w-40 truncate font-mono text-gray-900 dark:text-white">
          {{ tenant.activeTenantId }}
        </code>
        <button
          class="grid size-7 place-items-center rounded-md border bg-white text-gray-500 hover:text-brand-600 dark:bg-gray-950"
          type="button"
          :title="copiedOrganizationId ? 'Copied' : 'Copy organization ID'"
          @click="copyOrganizationId"
        >
          <Check v-if="copiedOrganizationId" class="size-4 text-emerald-600" />
          <Copy v-else class="size-4" />
        </button>
      </div>
      <button
        class="grid size-10 place-items-center rounded-full border hover:bg-gray-50 dark:hover:bg-gray-900"
        aria-label="Ganti tema"
        @click="app.darkMode = !app.darkMode"
      >
        <Sun v-if="app.darkMode" class="size-5" />
        <Moon v-else class="size-5" />
      </button>
      <div ref="accountMenuRef" class="relative">
        <button
          class="flex items-center gap-3 rounded-full border px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
          @click.stop="accountMenuOpen = !accountMenuOpen"
        >
          <span
            class="grid size-9 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700"
          >
            {{ auth.user?.name?.charAt(0).toUpperCase() }}
          </span>
          <span class="hidden text-left sm:block">
            <p class="text-sm font-semibold leading-5">{{ auth.user?.name }}</p>
            <p class="text-xs text-gray-500">{{ auth.user?.email }}</p>
          </span>
          <ChevronDown class="hidden size-4 text-gray-400 sm:block" />
        </button>

        <div
          v-if="accountMenuOpen"
          class="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
        >
          <div class="border-b px-4 py-3">
            <p class="text-sm font-semibold">{{ auth.user?.name }}</p>
            <p class="mt-0.5 truncate text-xs text-gray-500">{{ auth.user?.email }}</p>
          </div>
          <button
            v-if="tenant.activeTenantId"
            class="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
            type="button"
            @click="copyOrganizationId"
          >
            <Check v-if="copiedOrganizationId" class="size-4 text-emerald-600" />
            <Copy v-else class="size-4 text-gray-500" />
            <span class="min-w-0">
              <span class="block text-xs font-semibold uppercase text-gray-400">
                Organization ID
              </span>
              <code class="block truncate font-mono text-xs text-gray-700 dark:text-gray-200">
                {{ tenant.activeTenantId }}
              </code>
            </span>
          </button>
          <button
            class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            @click="logout"
          >
            <LogOut class="size-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
