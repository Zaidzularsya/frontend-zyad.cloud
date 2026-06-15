<script setup lang="ts">
import { computed, ref } from 'vue'
import { ShieldAlert, X } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import {
  useAssignPermissionMutation,
  useAssignRoleMutation,
  usePermissionsQuery,
  useRemovePermissionMutation,
  useRemoveRoleMutation,
  useRolesQuery,
  useUserDetailQuery,
} from '@/features/users/api/users.queries'

const props = defineProps<{
  isOpen: boolean
  userId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<'roles' | 'permissions'>('roles')

const userIdRef = computed(() => props.userId)
const userQuery = useUserDetailQuery(userIdRef)
const rolesQuery = useRolesQuery()
const permissionsQuery = usePermissionsQuery()

// Mutations
const assignRoleMut = useAssignRoleMutation(props.userId)
const removeRoleMut = useRemoveRoleMutation(props.userId)
const assignPermissionMut = useAssignPermissionMutation(props.userId)
const removePermissionMut = useRemovePermissionMutation(props.userId)

const assignedRolesMap = computed(() => {
  const map: Record<string, string> = {} // maps role_id to user_role assignment id (or roleId)
  if (!userQuery.data.value?.roles) return map
  userQuery.data.value.roles.forEach((r) => {
    map[r.id] = r.id // role ID in database
  })
  return map
})

const assignedPermissionsMap = computed(() => {
  const map: Record<string, { effect: 'allow' | 'deny'; id: string }> = {}
  if (!userQuery.data.value?.direct_permissions) return map
  userQuery.data.value.direct_permissions.forEach((dp) => {
    map[dp.permission_id] = { effect: dp.effect, id: dp.id }
  })
  return map
})

async function handleRoleToggle(roleId: string, isAssigned: boolean) {
  if (isAssigned) {
    // assign role
    await assignRoleMut.mutateAsync({ role_id: roleId, organization_id: null })
  } else {
    // remove role
    await removeRoleMut.mutateAsync(roleId)
  }
}

async function handlePermissionChange(permissionId: string, effect: 'allow' | 'deny' | 'none') {
  const existing = assignedPermissionsMap.value[permissionId]

  if (effect === 'none') {
    if (existing) {
      await removePermissionMut.mutateAsync(permissionId)
    }
  } else {
    await assignPermissionMut.mutateAsync({
      permission_id: permissionId,
      effect,
      organization_id: null,
    })
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-2xl overflow-hidden rounded-2xl border bg-white shadow-xl dark:bg-gray-900 transition-all flex flex-col h-[80vh]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
        <div>
          <h2 class="text-lg font-bold">Pengaturan Hak Akses</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            Kelola role dan izin khusus untuk:
            <span class="font-semibold text-gray-800 dark:text-gray-200">{{
              userQuery.data.value?.name
            }}</span>
          </p>
        </div>
        <button
          class="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="emit('close')"
        >
          <X class="size-5" />
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex border-b px-6 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
        <button
          class="border-b-2 px-4 py-3 text-sm font-semibold"
          :class="
            activeTab === 'roles'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          "
          @click="activeTab = 'roles'"
        >
          Roles (Peran)
        </button>
        <button
          class="border-b-2 px-4 py-3 text-sm font-semibold"
          :class="
            activeTab === 'permissions'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          "
          @click="activeTab = 'permissions'"
        >
          Permission Overrides (Izin Khusus)
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="userQuery.isPending.value" class="py-12 text-center text-sm text-gray-500">
          Memuat hak akses...
        </div>

        <div v-else-if="userQuery.isError.value" class="py-12 text-center text-sm text-red-600">
          Gagal memuat detail hak akses pengguna.
        </div>

        <div v-else>
          <!-- Roles Tab -->
          <div v-if="activeTab === 'roles'" class="space-y-4">
            <p class="text-sm text-gray-500 mb-2">
              Role mewakili sekumpulan izin standar. Pengguna dapat memiliki lebih dari satu role.
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label
                v-for="role in rolesQuery.data.value"
                :key="role.id"
                class="flex items-start gap-3 rounded-xl border p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                :class="{
                  'border-brand-300 bg-brand-50/20 dark:border-brand-800':
                    assignedRolesMap[role.id],
                }"
              >
                <input
                  type="checkbox"
                  :checked="Boolean(assignedRolesMap[role.id])"
                  class="size-4 mt-0.5 rounded border-gray-300 accent-brand-500"
                  @change="handleRoleToggle(role.id, ($event.target as HTMLInputElement).checked)"
                />
                <div>
                  <span class="block text-sm font-semibold">{{ role.name }}</span>
                  <span class="block text-xs text-gray-500 mt-0.5">{{
                    role.description || `Hak akses lingkup ${role.scope}`
                  }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Permissions Tab -->
          <div v-if="activeTab === 'permissions'" class="space-y-4">
            <div
              class="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 text-amber-800 mb-4 text-xs"
            >
              <ShieldAlert class="size-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong class="block mb-0.5">Override Kebijakan Izin</strong>
                Gunakan fitur ini hanya untuk memberikan izin khusus atau memblokir izin tertentu
                secara spesifik. Efek **Deny (Tolak)** memiliki prioritas lebih tinggi daripada
                Role.
              </div>
            </div>

            <div class="divide-y border rounded-xl overflow-hidden">
              <div
                v-for="perm in permissionsQuery.data.value"
                :key="perm.id"
                class="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <div>
                  <strong class="block text-sm">{{ perm.name }}</strong>
                  <code class="text-xs text-gray-500">{{ perm.slug }}</code>
                </div>

                <div
                  class="flex items-center gap-1 rounded-lg border bg-gray-50 p-1 dark:bg-gray-950"
                >
                  <button
                    class="rounded-md px-3 py-1.5 text-xs font-medium"
                    :class="
                      !assignedPermissionsMap[perm.id]
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    "
                    @click="handlePermissionChange(perm.id, 'none')"
                  >
                    Bawaan Role
                  </button>
                  <button
                    class="rounded-md px-3 py-1.5 text-xs font-medium"
                    :class="
                      assignedPermissionsMap[perm.id]?.effect === 'allow'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    "
                    @click="handlePermissionChange(perm.id, 'allow')"
                  >
                    Allow
                  </button>
                  <button
                    class="rounded-md px-3 py-1.5 text-xs font-medium"
                    :class="
                      assignedPermissionsMap[perm.id]?.effect === 'deny'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    "
                    @click="handlePermissionChange(perm.id, 'deny')"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div
        class="flex items-center justify-end border-t px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0"
      >
        <BaseButton variant="secondary" @click="emit('close')"> Tutup </BaseButton>
      </div>
    </div>
  </div>
</template>
