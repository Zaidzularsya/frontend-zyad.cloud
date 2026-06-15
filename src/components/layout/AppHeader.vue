<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown, LogOut, Menu, Moon, Search, Sun } from 'lucide-vue-next'

import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

const app = useAppStore()
const auth = useAuthStore()
const router = useRouter()

const accountMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)

async function logout() {
  accountMenuOpen.value = false
  await auth.logout()
  await router.replace({ name: 'login' })
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
