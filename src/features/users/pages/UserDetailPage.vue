<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  CircleAlert,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {
  useAssignPermissionMutation,
  useAssignRoleMutation,
  useDeleteUserMutation,
  usePermissionsQuery,
  useRemovePermissionMutation,
  useRemoveRoleMutation,
  useRestoreUserMutation,
  useRolesQuery,
  useUpdateUserStatusMutation,
  useUserDetailQuery,
} from '@/features/users/api/users.queries'
import { formatDate } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const userId = computed(() => String(route.params.id || ''))
const isNewRoute = computed(() => userId.value === 'new')
const userQuery = useUserDetailQuery(userId)
const rolesQuery = useRolesQuery()
const permissionsQuery = usePermissionsQuery()

const updateStatusMut = useUpdateUserStatusMutation()
const deleteUserMut = useDeleteUserMutation()
const restoreUserMut = useRestoreUserMutation()
const assignRoleMut = useAssignRoleMutation(userId.value)
const removeRoleMut = useRemoveRoleMutation(userId.value)
const assignPermissionMut = useAssignPermissionMutation(userId.value)
const removePermissionMut = useRemovePermissionMutation(userId.value)

const accessTab = ref<'roles' | 'permissions'>('roles')
const statusToApply = ref('active')
const statusReason = ref('')
const statusError = ref('')

watch(
  () => userQuery.data.value,
  (user) => {
    if (user) {
      statusToApply.value = user.status
    }
  },
  { immediate: true },
)

const user = computed(() => userQuery.data.value)

const assignedRolesMap = computed(() => {
  const map: Record<string, string> = {}
  user.value?.roles.forEach((role) => {
    map[role.id] = role.id
  })
  return map
})

const assignedPermissionsMap = computed(() => {
  const map: Record<string, { effect: 'allow' | 'deny'; id: string }> = {}
  user.value?.direct_permissions.forEach((permission) => {
    map[permission.permission_id] = { effect: permission.effect, id: permission.id }
  })
  return map
})

const activeRoles = computed(() => user.value?.roles ?? [])
const activePermissions = computed(() => user.value?.direct_permissions ?? [])

function goBack() {
  void router.push({ name: 'users' })
}

function resetStatusError() {
  statusError.value = ''
}

async function applyStatus() {
  if (!user.value) return

  if (
    (statusToApply.value === 'suspended' || statusToApply.value === 'banned') &&
    !statusReason.value.trim()
  ) {
    statusError.value = 'Reason wajib diisi untuk suspend atau ban.'
    return
  }

  statusError.value = ''
  await updateStatusMut.mutateAsync({
    id: user.value.id,
    status: statusToApply.value,
    reason: statusReason.value.trim() || undefined,
  })
  statusReason.value = ''
}

async function handleRoleToggle(roleId: string, isAssigned: boolean) {
  if (!user.value) return

  if (isAssigned) {
    await assignRoleMut.mutateAsync({ role_id: roleId, organization_id: null })
  } else {
    await removeRoleMut.mutateAsync(roleId)
  }
}

async function handlePermissionChange(permissionId: string, effect: 'allow' | 'deny' | 'none') {
  if (!user.value) return
  const existing = assignedPermissionsMap.value[permissionId]

  if (effect === 'none') {
    if (existing) {
      await removePermissionMut.mutateAsync(permissionId)
    }
    return
  }

  await assignPermissionMut.mutateAsync({
    permission_id: permissionId,
    effect,
    organization_id: null,
  })
}

async function handleDelete() {
  if (!user.value) return
  if (!confirm(`Hapus pengguna ${user.value.name}?`)) return
  await deleteUserMut.mutateAsync(user.value.id)
  await router.push({ name: 'users' })
}

async function handleRestore() {
  if (!user.value) return
  await restoreUserMut.mutateAsync(user.value.id)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="user?.name || 'User Detail'"
      description="Detail lengkap, hak akses, dan kontrol status pengguna dalam satu halaman."
    >
      <BaseButton variant="secondary" @click="goBack">
        <ArrowLeft class="size-4" /> Kembali
      </BaseButton>
    </PageHeader>

    <div
      v-if="userQuery.isPending.value"
      class="min-h-[420px] rounded-2xl border bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900"
    >
      Memuat detail pengguna...
    </div>
    <div
      v-else-if="userQuery.isError.value"
      class="min-h-[420px] rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900"
    >
      <p class="font-semibold text-red-700">Detail pengguna gagal dimuat.</p>
      <button class="mt-2 text-sm font-medium text-brand-600" @click="userQuery.refetch()">
        Coba lagi
      </button>
    </div>

    <div
      v-else-if="isNewRoute"
      class="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900"
    >
      <p class="font-semibold">Create user belum diaktifkan pada alur baru ini.</p>
      <p class="mt-2 text-sm text-gray-500">
        Untuk saat ini, list user dan halaman detail sudah tersedia tanpa modal. Jika kamu mau, saya
        bisa lanjut aktifkan form create/edit sebagai halaman penuh berikutnya.
      </p>
      <div class="mt-4">
        <BaseButton variant="secondary" @click="goBack">Kembali ke Users</BaseButton>
      </div>
    </div>

    <div v-else-if="user" class="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
      <div class="space-y-6">
        <BaseCard>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex items-start gap-4">
              <div
                class="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-100"
              >
                {{ user.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-2xl font-bold tracking-tight">{{ user.name }}</h2>
                  <span
                    class="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                    :class="
                      user.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : user.status === 'suspended'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : user.status === 'banned'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    "
                  >
                    {{ user.status }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  {{ user.username || '-' }} • {{ user.email }}
                </p>
                <p v-if="user.phone" class="mt-1 text-sm text-gray-500">{{ user.phone }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <BaseButton
                variant="secondary"
                :disabled="restoreUserMut.isPending.value"
                @click="handleRestore"
              >
                Pulihkan
              </BaseButton>
              <BaseButton
                variant="danger"
                :disabled="deleteUserMut.isPending.value"
                @click="handleDelete"
              >
                <Trash2 class="size-4" /> Hapus
              </BaseButton>
            </div>
          </div>
        </BaseCard>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BaseCard class="!p-4">
            <p class="text-xs uppercase tracking-wider text-gray-500">Email verified</p>
            <p class="mt-2 text-sm font-semibold">
              {{
                user.email_verified_at ? formatDate(user.email_verified_at) : 'Belum diverifikasi'
              }}
            </p>
          </BaseCard>
          <BaseCard class="!p-4">
            <p class="text-xs uppercase tracking-wider text-gray-500">Phone verified</p>
            <p class="mt-2 text-sm font-semibold">
              {{
                user.phone_verified_at ? formatDate(user.phone_verified_at) : 'Belum diverifikasi'
              }}
            </p>
          </BaseCard>
          <BaseCard class="!p-4">
            <p class="text-xs uppercase tracking-wider text-gray-500">Last login</p>
            <p class="mt-2 text-sm font-semibold">
              {{ user.last_login_at ? formatDate(user.last_login_at) : 'Belum pernah login' }}
            </p>
          </BaseCard>
          <BaseCard class="!p-4">
            <p class="text-xs uppercase tracking-wider text-gray-500">Created at</p>
            <p class="mt-2 text-sm font-semibold">{{ formatDate(user.created_at) }}</p>
          </BaseCard>
          <BaseCard class="!p-4">
            <p class="text-xs uppercase tracking-wider text-gray-500">Updated at</p>
            <p class="mt-2 text-sm font-semibold">{{ formatDate(user.updated_at) }}</p>
          </BaseCard>
          <BaseCard class="!p-4">
            <p class="text-xs uppercase tracking-wider text-gray-500">Deleted at</p>
            <p class="mt-2 text-sm font-semibold">
              {{ user.deleted_at ? formatDate(user.deleted_at) : 'Aktif' }}
            </p>
          </BaseCard>
        </div>

        <BaseCard>
          <div class="flex items-center gap-2">
            <ShieldCheck class="size-5 text-brand-600" />
            <h3 class="text-lg font-semibold">Akses & RBAC</h3>
          </div>

          <div class="mt-4 flex gap-2 border-b overflow-x-auto">
            <button
              class="border-b-2 px-4 py-2 text-sm font-medium transition-all"
              :class="
                accessTab === 'roles'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              "
              @click="accessTab = 'roles'"
            >
              Roles
            </button>
            <button
              class="border-b-2 px-4 py-2 text-sm font-medium transition-all"
              :class="
                accessTab === 'permissions'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              "
              @click="accessTab = 'permissions'"
            >
              Permissions
            </button>
          </div>

          <div v-if="accessTab === 'roles'" class="mt-5 space-y-4">
            <div v-if="rolesQuery.isPending.value" class="py-10 text-center text-sm text-gray-500">
              Memuat role...
            </div>
            <div v-else class="grid gap-3 md:grid-cols-2">
              <label
                v-for="role in rolesQuery.data.value || []"
                :key="role.id"
                class="flex items-start gap-3 rounded-xl border p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                :class="
                  assignedRolesMap[role.id]
                    ? 'border-brand-300 bg-brand-50/30 dark:border-brand-800'
                    : ''
                "
              >
                <input
                  type="checkbox"
                  :checked="Boolean(assignedRolesMap[role.id])"
                  class="mt-0.5 size-4 rounded border-gray-300 accent-brand-500"
                  @change="handleRoleToggle(role.id, ($event.target as HTMLInputElement).checked)"
                />
                <div class="min-w-0">
                  <span class="block text-sm font-semibold">{{ role.name }}</span>
                  <span class="block text-xs text-gray-500">{{ role.slug }}</span>
                  <span class="mt-1 block text-xs text-gray-500">
                    {{ role.description || `Scope ${role.scope}` }}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div v-else class="mt-5 space-y-4">
            <div
              class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
            >
              <div class="flex gap-3">
                <ShieldAlert class="mt-0.5 size-5 shrink-0" />
                <div>
                  <strong class="block text-sm">Permission overrides</strong>
                  Gunakan Allow atau Deny untuk override dari role. Deny selalu menang.
                </div>
              </div>
            </div>

            <div
              v-if="permissionsQuery.isPending.value"
              class="py-10 text-center text-sm text-gray-500"
            >
              Memuat permission...
            </div>
            <div v-else class="divide-y rounded-xl border overflow-hidden">
              <div
                v-for="permission in permissionsQuery.data.value || []"
                :key="permission.id"
                class="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <div class="min-w-0">
                  <strong class="block text-sm">{{ permission.name }}</strong>
                  <span class="block text-xs text-gray-500">{{ permission.slug }}</span>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    class="rounded-md border px-3 py-1.5 text-xs font-medium"
                    :class="
                      !assignedPermissionsMap[permission.id]
                        ? 'bg-white shadow-sm dark:bg-gray-800'
                        : 'text-gray-500'
                    "
                    @click="handlePermissionChange(permission.id, 'none')"
                  >
                    Bawaan role
                  </button>
                  <button
                    class="rounded-md border px-3 py-1.5 text-xs font-medium"
                    :class="
                      assignedPermissionsMap[permission.id]?.effect === 'allow'
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-500'
                    "
                    @click="handlePermissionChange(permission.id, 'allow')"
                  >
                    Allow
                  </button>
                  <button
                    class="rounded-md border px-3 py-1.5 text-xs font-medium"
                    :class="
                      assignedPermissionsMap[permission.id]?.effect === 'deny'
                        ? 'bg-red-500 text-white'
                        : 'text-gray-500'
                    "
                    @click="handlePermissionChange(permission.id, 'deny')"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      <div class="space-y-6">
        <BaseCard>
          <div class="flex items-center gap-2">
            <RefreshCw class="size-5 text-brand-600" />
            <h3 class="text-lg font-semibold">Status management</h3>
          </div>

          <div class="mt-4 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </span>
              <select
                v-model="statusToApply"
                class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                @change="resetStatusError"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="invited">Invited</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason
              </span>
              <textarea
                v-model="statusReason"
                rows="4"
                class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                placeholder="Isi alasan bila suspend atau ban"
                @input="resetStatusError"
              />
              <span v-if="statusError" class="mt-1 block text-xs text-red-600">{{
                statusError
              }}</span>
            </label>

            <BaseButton
              class="w-full"
              :disabled="updateStatusMut.isPending.value"
              @click="applyStatus"
            >
              <UserCheck class="size-4" />
              {{ updateStatusMut.isPending.value ? 'Menyimpan...' : 'Terapkan status' }}
            </BaseButton>
          </div>
        </BaseCard>

        <BaseCard>
          <div class="flex items-center gap-2">
            <CircleAlert class="size-5 text-red-600" />
            <h3 class="text-lg font-semibold">Danger zone</h3>
          </div>
          <p class="mt-3 text-sm text-gray-500">
            Tindakan berikut bersifat permanen atau memengaruhi sesi login pengguna.
          </p>
          <div class="mt-4 space-y-3">
            <BaseButton
              variant="danger"
              class="w-full"
              :disabled="deleteUserMut.isPending.value"
              @click="handleDelete"
            >
              <Trash2 class="size-4" />
              Hapus user
            </BaseButton>
            <BaseButton
              variant="secondary"
              class="w-full"
              :disabled="restoreUserMut.isPending.value"
              @click="handleRestore"
            >
              <RefreshCw class="size-4" />
              Pulihkan user
            </BaseButton>
          </div>
        </BaseCard>

        <BaseCard>
          <h3 class="text-lg font-semibold">Quick facts</h3>
          <div class="mt-4 space-y-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Roles</span>
              <span class="font-medium">{{ activeRoles.length }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Direct permissions</span>
              <span class="font-medium">{{ activePermissions.length }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Created</span>
              <span class="font-medium">{{ formatDate(user.created_at) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Updated</span>
              <span class="font-medium">{{ formatDate(user.updated_at) }}</span>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <div v-else class="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-gray-900">
      <p class="font-semibold text-gray-900 dark:text-white">User tidak ditemukan.</p>
      <p class="mt-2 text-sm text-gray-500">
        Periksa kembali id user atau kembali ke daftar pengguna.
      </p>
      <div class="mt-4">
        <BaseButton variant="secondary" @click="goBack">Kembali ke Users</BaseButton>
      </div>
    </div>
  </div>
</template>
