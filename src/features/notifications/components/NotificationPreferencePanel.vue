<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, RefreshCw, Save, UserCog } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useAdminUserNotificationPreferencesQuery,
  useMyNotificationPreferencesQuery,
  useUpdateMyNotificationPreferencesMutation,
  useUpdateUserNotificationPreferencesMutation,
} from '@/features/notifications/api/notifications.queries'
import type {
  NotificationPreferenceResponse,
  PreferenceRowPayload,
} from '@/features/notifications/api/notifications.api'

const selfOrgInput = ref('')
const selfOrgId = ref('')
const selfRows = ref<PreferenceRowPayload[]>([])
const selfError = ref('')

const adminUserInput = ref('')
const adminOrgInput = ref('')
const adminUserId = ref('')
const adminOrgId = ref('')
const adminRows = ref<PreferenceRowPayload[]>([])
const adminError = ref('')

const selfQuery = useMyNotificationPreferencesQuery(selfOrgId)
const adminQuery = useAdminUserNotificationPreferencesQuery(adminUserId, adminOrgId)
const updateSelfMut = useUpdateMyNotificationPreferencesMutation()
const updateAdminMut = useUpdateUserNotificationPreferencesMutation()

const selfCount = computed(() => selfRows.value.length)
const adminCount = computed(() => adminRows.value.length)

function cloneRows(rows: NotificationPreferenceResponse[]) {
  return rows.map((row) => ({
    event_type: row.event_type,
    channel: row.channel,
    is_enabled: row.is_enabled,
  }))
}

watch(
  () => selfQuery.data.value,
  (rows) => {
    selfRows.value = rows ? cloneRows(rows) : []
  },
  { immediate: true },
)

watch(
  () => adminQuery.data.value,
  (rows) => {
    adminRows.value = rows ? cloneRows(rows) : []
  },
  { immediate: true },
)

function addRow(target: 'self' | 'admin') {
  const row: PreferenceRowPayload = {
    event_type: '',
    channel: 'email',
    is_enabled: true,
  }
  if (target === 'self') {
    selfRows.value = [...selfRows.value, row]
  } else {
    adminRows.value = [...adminRows.value, row]
  }
}

function removeRow(target: 'self' | 'admin', index: number) {
  if (target === 'self') {
    selfRows.value = selfRows.value.filter((_, rowIndex) => rowIndex !== index)
    return
  }
  adminRows.value = adminRows.value.filter((_, rowIndex) => rowIndex !== index)
}

async function loadSelf() {
  selfOrgId.value = selfOrgInput.value.trim()
  selfError.value = ''
  try {
    await selfQuery.refetch()
  } catch (error) {
    console.error(error)
    selfError.value = 'Gagal memuat self preferences.'
  }
}

async function loadAdmin() {
  adminUserId.value = adminUserInput.value.trim()
  adminOrgId.value = adminOrgInput.value.trim()
  adminError.value = ''
  try {
    await adminQuery.refetch()
  } catch (error) {
    console.error(error)
    adminError.value = 'Gagal memuat preferences user.'
  }
}

async function saveSelf() {
  selfError.value = ''
  try {
    await updateSelfMut.mutateAsync({
      organizationId: selfOrgId.value || undefined,
      payload: { preferences: selfRows.value },
    })
    await selfQuery.refetch()
  } catch (error) {
    console.error(error)
    selfError.value = 'Gagal menyimpan self preferences.'
  }
}

async function saveAdmin() {
  if (!adminUserId.value.trim()) {
    adminError.value = 'User ID wajib diisi.'
    return
  }
  adminError.value = ''
  try {
    await updateAdminMut.mutateAsync({
      userId: adminUserId.value,
      organizationId: adminOrgId.value || undefined,
      payload: { preferences: adminRows.value },
    })
    await adminQuery.refetch()
  } catch (error) {
    console.error(error)
    adminError.value = 'Gagal menyimpan preferences user.'
  }
}

function tone(enabled: boolean) {
  return enabled
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-2">
    <BaseCard class="space-y-4">
      <div class="flex items-center gap-2">
        <UserCog class="size-5 text-brand-600" />
        <h2 class="text-lg font-semibold">My preferences</h2>
      </div>
      <p class="text-sm text-gray-500">
        Edit preferensi notifikasi yang aktif untuk user login saat ini. Organization ID bisa
        dipakai jika environment kamu multi-tenant.
      </p>

      <div class="flex flex-col gap-3 sm:flex-row">
        <input
          v-model="selfOrgInput"
          type="text"
          placeholder="Organization ID (optional)"
          class="flex-1 rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
        <BaseButton variant="secondary" @click="loadSelf">
          <RefreshCw class="size-4" /> Load
        </BaseButton>
      </div>

      <div class="space-y-3">
        <div
          v-for="(row, index) in selfRows"
          :key="`${row.event_type}:${row.channel}:${index}`"
          class="grid gap-3 rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900 md:grid-cols-[1.2fr_0.8fr_auto]"
        >
          <input
            v-model="row.event_type"
            type="text"
            placeholder="event type"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <select
            v-model="row.channel"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="in_app">In-app</option>
            <option value="discord">Discord</option>
          </select>
          <div class="flex items-center gap-2">
            <label
              class="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
            >
              <input v-model="row.is_enabled" type="checkbox" class="rounded border-gray-300" />
              Enabled
            </label>
            <button
              class="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="removeRow('self', index)"
            >
              Remove
            </button>
          </div>
        </div>

        <div
          v-if="!selfRows.length"
          class="rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500"
        >
          Belum ada preference. Load data lalu tambah baris baru.
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <BaseButton variant="secondary" @click="addRow('self')">
          <Plus class="size-4" /> Add row
        </BaseButton>
        <BaseButton :disabled="updateSelfMut.isPending.value" @click="saveSelf">
          <Save class="size-4" />
          {{ updateSelfMut.isPending.value ? 'Saving...' : 'Save preferences' }}
        </BaseButton>
      </div>

      <p v-if="selfError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ selfError }}
      </p>

      <div class="rounded-xl border bg-gray-50 p-4 text-sm dark:bg-gray-900">
        <div class="flex items-center justify-between gap-3">
          <span class="text-gray-500">Loaded rows</span>
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="tone(selfCount > 0)">
            {{ selfCount }}
          </span>
        </div>
      </div>
    </BaseCard>

    <BaseCard class="space-y-4">
      <div class="flex items-center gap-2">
        <UserCog class="size-5 text-brand-600" />
        <h2 class="text-lg font-semibold">Admin user override</h2>
      </div>
      <p class="text-sm text-gray-500">
        Override preferences untuk user tertentu tanpa keluar dari halaman management ini.
      </p>

      <div class="grid gap-3 md:grid-cols-2">
        <input
          v-model="adminUserInput"
          type="text"
          placeholder="User ID"
          class="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
        <input
          v-model="adminOrgInput"
          type="text"
          placeholder="Organization ID (optional)"
          class="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
      </div>
      <BaseButton variant="secondary" class="w-full justify-center" @click="loadAdmin">
        <RefreshCw class="size-4" /> Load user preferences
      </BaseButton>

      <div class="space-y-3">
        <div
          v-for="(row, index) in adminRows"
          :key="`${row.event_type}:${row.channel}:${index}`"
          class="grid gap-3 rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900 md:grid-cols-[1.2fr_0.8fr_auto]"
        >
          <input
            v-model="row.event_type"
            type="text"
            placeholder="event type"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <select
            v-model="row.channel"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="in_app">In-app</option>
            <option value="discord">Discord</option>
          </select>
          <div class="flex items-center gap-2">
            <label
              class="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
            >
              <input v-model="row.is_enabled" type="checkbox" class="rounded border-gray-300" />
              Enabled
            </label>
            <button
              class="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="removeRow('admin', index)"
            >
              Remove
            </button>
          </div>
        </div>

        <div
          v-if="!adminRows.length"
          class="rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500"
        >
          Masukkan user ID lalu load untuk mulai edit preference user.
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <BaseButton variant="secondary" @click="addRow('admin')">
          <Plus class="size-4" /> Add row
        </BaseButton>
        <BaseButton :disabled="updateAdminMut.isPending.value" @click="saveAdmin">
          <Save class="size-4" />
          {{ updateAdminMut.isPending.value ? 'Saving...' : 'Save user preferences' }}
        </BaseButton>
      </div>

      <p v-if="adminError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ adminError }}
      </p>

      <div class="rounded-xl border bg-gray-50 p-4 text-sm dark:bg-gray-900">
        <div class="flex items-center justify-between gap-3">
          <span class="text-gray-500">Loaded rows</span>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="tone(adminCount > 0)"
          >
            {{ adminCount }}
          </span>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
