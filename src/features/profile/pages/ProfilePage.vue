<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, ShieldCheck, UserCircle2, Users } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'

const auth = useAuthStore()
const tenant = useTenantStore()
const router = useRouter()

const permissionPreview = computed(() => auth.user?.permissions.slice(0, 8) ?? [])
const permissionCount = computed(() => auth.user?.permissions.length ?? 0)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Profile"
      description="Halaman utama setelah login menampilkan identitas pengguna, workspace aktif, dan akses cepat."
    >
      <BaseButton variant="secondary" @click="router.push({ name: 'notifications' })">
        <Bell class="size-4" /> Notification Settings
      </BaseButton>
    </PageHeader>

    <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <BaseCard class="space-y-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            class="grid size-20 place-items-center rounded-3xl bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-100"
          >
            {{ auth.user?.name?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div class="min-w-0">
            <p class="text-sm uppercase tracking-wider text-gray-500">Signed in as</p>
            <h1 class="truncate text-3xl font-bold tracking-tight">
              {{ auth.user?.name || 'Unknown user' }}
            </h1>
            <p class="mt-1 text-sm text-gray-500">{{ auth.user?.email || '-' }}</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-sm text-gray-500">Workspace aktif</p>
            <p class="mt-1 font-semibold">{{ tenant.activeTenant?.name || 'Belum dipilih' }}</p>
            <p class="text-xs text-gray-500">{{ tenant.activeTenant?.slug || '-' }}</p>
          </div>
          <div class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-sm text-gray-500">Permission</p>
            <p class="mt-1 font-semibold">{{ permissionCount }}</p>
            <p class="text-xs text-gray-500">Akses yang dimiliki user saat ini</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <span
            v-for="permission in permissionPreview"
            :key="permission"
            class="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:ring-gray-800"
          >
            {{ permission }}
          </span>
          <span
            v-if="permissionCount > permissionPreview.length"
            class="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:ring-gray-800"
          >
            +{{ permissionCount - permissionPreview.length }}
          </span>
        </div>
      </BaseCard>

      <BaseCard class="space-y-4">
        <div class="flex items-center gap-2">
          <UserCircle2 class="size-5 text-brand-600" />
          <h2 class="text-lg font-semibold">Quick access</h2>
        </div>
        <p class="text-sm text-gray-500">
          Dari halaman ini kamu bisa lanjut ke area yang paling sering dipakai setelah login.
        </p>
        <div class="grid gap-3">
          <BaseButton
            variant="secondary"
            class="w-full justify-start"
            @click="router.push({ name: 'notifications' })"
          >
            <Bell class="size-4" />
            Notification Management
          </BaseButton>
          <BaseButton
            variant="secondary"
            class="w-full justify-start"
            @click="router.push({ name: 'users' })"
          >
            <Users class="size-4" />
            Users
          </BaseButton>
          <BaseButton
            variant="secondary"
            class="w-full justify-start"
            @click="router.push({ name: 'rbac' })"
          >
            <ShieldCheck class="size-4" />
            Core Permission & RBAC
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
