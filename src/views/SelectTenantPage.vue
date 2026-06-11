<script setup lang="ts">
import { Building2, LogOut } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenantStore = useTenantStore()

async function select(tenantId: string) {
  tenantStore.select(tenantId)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await router.replace(redirect)
}

async function logout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-5xl items-center p-6">
    <div class="w-full">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="mb-4 grid size-12 place-items-center rounded-xl bg-brand-100 text-brand-600">
            <Building2 />
          </span>
          <h1 class="text-3xl font-bold">Pilih workspace</h1>
          <p class="mt-2 text-gray-500">Data dan akses Anda akan mengikuti workspace aktif.</p>
        </div>
        <BaseButton variant="secondary" @click="logout"
          ><LogOut class="size-4" /> Keluar</BaseButton
        >
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="tenant in tenantStore.tenants"
          :key="tenant.id"
          class="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-brand-400 hover:shadow-md dark:bg-gray-900"
          @click="select(tenant.id)"
        >
          <span
            class="grid size-11 place-items-center rounded-xl bg-gray-100 font-bold text-brand-600 dark:bg-gray-800"
          >
            {{ tenant.name.charAt(0) }}
          </span>
          <strong class="mt-4 block">{{ tenant.name }}</strong>
          <span class="mt-1 block text-sm capitalize text-gray-500">{{ tenant.plan }} plan</span>
        </button>
      </div>
    </div>
  </div>
</template>
