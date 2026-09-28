<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import EmailComposeDock from '@/features/email/components/EmailComposeDock.vue'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

const app = useAppStore()
const auth = useAuthStore()
</script>

<template>
  <div class="min-h-screen">
    <div
      v-if="app.sidebarOpen"
      class="fixed inset-0 z-40 bg-gray-950/50 lg:hidden"
      @click="app.sidebarOpen = false"
    />
    <AppSidebar />
    <div class="lg:pl-72">
      <AppHeader />
      <main class="p-4 sm:p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
    <EmailComposeDock v-if="auth.can('email.send')" />
  </div>
</template>
