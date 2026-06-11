<script setup lang="ts">
import { Menu, Moon, Search, Sun } from 'lucide-vue-next'

import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

const app = useAppStore()
const auth = useAuthStore()
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
      <div class="hidden text-right sm:block">
        <p class="text-sm font-semibold">{{ auth.user?.name }}</p>
        <p class="text-xs text-gray-500">{{ auth.user?.email }}</p>
      </div>
      <span
        class="grid size-10 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700"
      >
        {{ auth.user?.name?.charAt(0).toUpperCase() }}
      </span>
    </div>
  </header>
</template>
