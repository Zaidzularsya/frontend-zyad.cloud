<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Bell, Layers3, MessageSquareText, RefreshCw, ShieldCheck } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'

import NotificationLogPanel from '@/features/notifications/components/NotificationLogPanel.vue'
import NotificationPreferencePanel from '@/features/notifications/components/NotificationPreferencePanel.vue'
import NotificationTemplatePanel from '@/features/notifications/components/NotificationTemplatePanel.vue'

type NotificationTab = 'overview' | 'templates' | 'logs' | 'preferences'
type NotificationTabItem = {
  key: NotificationTab
  label: string
  icon: Component
  permission?: Permission
}

const activeTab = ref<NotificationTab>('overview')
const auth = useAuthStore()

const tabs = computed<NotificationTabItem[]>(() => [
  { key: 'overview' as const, label: 'Overview', icon: ShieldCheck },
  {
    key: 'templates' as const,
    label: 'Templates',
    icon: MessageSquareText,
    permission: 'notification_template.read',
  },
  { key: 'logs' as const, label: 'Logs', icon: Layers3, permission: 'notification_log.read' },
  {
    key: 'preferences' as const,
    label: 'Preferences',
    icon: Bell,
    permission: 'notification_preference.read',
  },
])

const visibleTabs = computed(() =>
  tabs.value.filter((tab) => !tab.permission || auth.can(tab.permission)),
)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Notification Management"
      description="Kelola template, log pengiriman, dan preferensi notifikasi dalam satu workspace admin."
    >
      <div class="flex flex-wrap gap-2">
        <PermissionGate permission="notification_template.read">
          <BaseButton variant="secondary" @click="activeTab = 'templates'">
            <MessageSquareText class="size-4" /> Templates
          </BaseButton>
        </PermissionGate>
        <BaseButton variant="secondary" @click="activeTab = 'logs'">
          <Layers3 class="size-4" /> Logs
        </BaseButton>
        <BaseButton variant="secondary" @click="activeTab = 'preferences'">
          <Bell class="size-4" /> Preferences
        </BaseButton>
      </div>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <MessageSquareText class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Template catalog</p>
            <p class="text-2xl font-bold">CRUD ready</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Layers3 class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Delivery logs</p>
            <p class="text-2xl font-bold">Retry & cancel</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <Bell class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Preferences</p>
            <p class="text-2xl font-bold">Self & admin</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-gray-100 text-gray-600">
            <RefreshCw class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Experience</p>
            <p class="text-2xl font-bold">No modal</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in visibleTabs"
        :key="tab.key"
        class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-all"
        :class="
          activeTab === tab.key
            ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        "
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" class="size-4" />
        {{ tab.label }}
      </button>
    </div>

    <div v-show="activeTab === 'overview'" class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <BaseCard class="space-y-4">
        <div class="flex items-center gap-2">
          <ShieldCheck class="size-5 text-brand-600" />
          <h2 class="text-lg font-semibold">Overview</h2>
        </div>
        <p class="text-sm text-gray-500">
          Notification module ini dibuat untuk admin enterprise yang butuh kontrol template,
          observability log, dan pengaturan preferensi tanpa modal dialog yang mengganggu.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-sm text-gray-500">Template workflow</p>
            <p class="mt-1 font-semibold">Create, edit, preview, archive, clone</p>
          </div>
          <div class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-sm text-gray-500">Log workflow</p>
            <p class="mt-1 font-semibold">Inspect, retry, cancel, trace provider response</p>
          </div>
          <div class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-sm text-gray-500">Preferences</p>
            <p class="mt-1 font-semibold">Self service dan admin override by user</p>
          </div>
          <div class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-sm text-gray-500">UX guardrail</p>
            <p class="mt-1 font-semibold">Sticky panel, min height, and clear selection state</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="space-y-4">
        <div class="flex items-center gap-2">
          <Bell class="size-5 text-brand-600" />
          <h2 class="text-lg font-semibold">Quick actions</h2>
        </div>
        <PermissionGate permission="notification_template.read">
          <BaseButton class="w-full justify-center" @click="activeTab = 'templates'">
            <MessageSquareText class="size-4" /> Manage templates
          </BaseButton>
        </PermissionGate>
        <PermissionGate permission="notification_log.read">
          <BaseButton variant="secondary" class="w-full justify-center" @click="activeTab = 'logs'">
            <Layers3 class="size-4" /> Review logs
          </BaseButton>
        </PermissionGate>
        <PermissionGate permission="notification_preference.read">
          <BaseButton
            variant="secondary"
            class="w-full justify-center"
            @click="activeTab = 'preferences'"
          >
            <Bell class="size-4" /> Open preferences
          </BaseButton>
        </PermissionGate>
      </BaseCard>
    </div>

    <NotificationTemplatePanel
      v-if="auth.can('notification_template.read')"
      v-show="activeTab === 'templates'"
    />
    <NotificationLogPanel v-if="auth.can('notification_log.read')" v-show="activeTab === 'logs'" />
    <NotificationPreferencePanel
      v-if="auth.can('notification_preference.read')"
      v-show="activeTab === 'preferences'"
    />
  </div>
</template>
