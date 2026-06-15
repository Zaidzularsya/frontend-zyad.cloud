<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  KeyRound,
  Layers3,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useCreatePermissionMutation,
  useDeletePermissionMutation,
  useGroupedPermissionsQuery,
  usePermissionMatrixQuery,
  useRbacPermissionsQuery,
  useRbacRolesQuery,
  useUpdatePermissionMutation,
} from '@/features/rbac/api/rbac.queries'
import type { PermissionResponse } from '@/features/rbac/api/rbac.api'

type RbacTab = 'overview' | 'permissions' | 'roles' | 'matrix'
type PermissionFormMode = 'create' | 'edit'

const activeTab = ref<RbacTab>('overview')
const search = ref('')
const selectedModule = ref('all')
const permissionFormMode = ref<PermissionFormMode>('create')
const selectedPermissionId = ref('')
const formName = ref('')
const formDescription = ref('')
const formModuleId = ref('')
const formError = ref('')

const rolesQuery = useRbacRolesQuery()
const permissionsQuery = useRbacPermissionsQuery()
const groupedPermissionsQuery = useGroupedPermissionsQuery()
const matrixQuery = usePermissionMatrixQuery()
const createPermissionMut = useCreatePermissionMutation()
const updatePermissionMut = useUpdatePermissionMutation()
const deletePermissionMut = useDeletePermissionMutation()

const roles = computed(() => rolesQuery.data.value ?? [])
const permissions = computed(() => permissionsQuery.data.value ?? [])
const groupedPermissions = computed(() => groupedPermissionsQuery.data.value ?? {})
const matrix = computed(() => matrixQuery.data.value?.matrix ?? {})

const modules = computed(() => {
  const collected = new Set<string>()
  permissions.value.forEach((permission) => collected.add(permission.module))
  return ['all', ...Array.from(collected).sort()]
})

const filteredPermissions = computed(() => {
  const term = search.value.trim().toLowerCase()
  return permissions.value.filter((permission) => {
    const matchesModule =
      selectedModule.value === 'all' || permission.module === selectedModule.value
    const matchesTerm =
      !term ||
      permission.name.toLowerCase().includes(term) ||
      permission.slug.toLowerCase().includes(term) ||
      permission.module.toLowerCase().includes(term) ||
      permission.action.toLowerCase().includes(term) ||
      permission.description?.toLowerCase().includes(term)
    return matchesModule && matchesTerm
  })
})

const filteredGroupedPermissions = computed(() => {
  const entries = Object.entries(groupedPermissions.value)
  const term = search.value.trim().toLowerCase()
  return entries
    .filter(([module]) => selectedModule.value === 'all' || module === selectedModule.value)
    .map(
      ([module, items]) =>
        [
          module,
          items.filter(
            (permission) =>
              !term ||
              permission.name.toLowerCase().includes(term) ||
              permission.slug.toLowerCase().includes(term) ||
              permission.action.toLowerCase().includes(term),
          ),
        ] as const,
    )
    .filter(([, items]) => items.length)
})

const selectedPermission = computed<PermissionResponse | null>(() => {
  if (!selectedPermissionId.value) return null
  return (
    permissions.value.find((permission) => permission.id === selectedPermissionId.value) ?? null
  )
})

const matrixColumns = computed(() => matrixQuery.data.value?.roles ?? roles.value)
const systemRoleCount = computed(() => roles.value.filter((role) => role.is_system).length)
const totalMatrixCells = computed(() =>
  matrixColumns.value.reduce(
    (count, role) => count + Object.keys(matrix.value[role.id] ?? {}).length,
    0,
  ),
)

const overviewStats = computed(() => [
  { label: 'Roles', value: roles.value.length },
  { label: 'Permissions', value: permissions.value.length },
  { label: 'System roles', value: systemRoleCount.value },
  { label: 'Matrix cells', value: totalMatrixCells.value },
])

function refreshAll() {
  void Promise.all([
    rolesQuery.refetch(),
    permissionsQuery.refetch(),
    groupedPermissionsQuery.refetch(),
    matrixQuery.refetch(),
  ])
}

function selectPermission(permission: PermissionResponse) {
  permissionFormMode.value = 'edit'
  selectedPermissionId.value = permission.id
  formName.value = permission.name
  formDescription.value = permission.description || ''
  formModuleId.value = ''
  formError.value = ''
}

function createNewPermission() {
  permissionFormMode.value = 'create'
  selectedPermissionId.value = ''
  formName.value = ''
  formDescription.value = ''
  formModuleId.value = ''
  formError.value = ''
}

watch(
  permissions,
  (items) => {
    if (!items.length) {
      createNewPermission()
      return
    }
    const firstPermission = items[0]
    if (!firstPermission) {
      createNewPermission()
      return
    }
    if (!selectedPermissionId.value) {
      selectPermission(firstPermission)
    }
    if (
      selectedPermissionId.value &&
      !items.some((permission) => permission.id === selectedPermissionId.value)
    ) {
      selectPermission(firstPermission)
    }
  },
  { immediate: true },
)

watch(selectedModule, () => {
  search.value = ''
})

async function savePermission() {
  formError.value = ''
  if (permissionFormMode.value === 'create' && formName.value.trim().length < 3) {
    formError.value = 'Nama permission minimal 3 karakter.'
    return
  }

  try {
    if (permissionFormMode.value === 'create') {
      await createPermissionMut.mutateAsync({
        name: formName.value.trim(),
        description: formDescription.value.trim() || undefined,
        module_id: formModuleId.value.trim() || undefined,
      })
      createNewPermission()
    } else if (selectedPermission.value) {
      await updatePermissionMut.mutateAsync({
        id: selectedPermission.value.id,
        payload: {
          description: formDescription.value.trim() || undefined,
          module_id: formModuleId.value.trim() || undefined,
        },
      })
    }
  } catch (error) {
    console.error(error)
    formError.value = 'Gagal menyimpan permission.'
  }
}

async function deleteSelectedPermission() {
  if (!selectedPermission.value) return
  const confirmed = confirm(`Hapus permission "${selectedPermission.value.name}"?`)
  if (!confirmed) return

  try {
    await deletePermissionMut.mutateAsync(selectedPermission.value.id)
    createNewPermission()
  } catch (error) {
    console.error(error)
    formError.value = 'Gagal menghapus permission.'
  }
}

function statusTone(roleOrPermission: string) {
  if (roleOrPermission === 'active' || roleOrPermission === 'allow') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
  }
  if (roleOrPermission === 'suspended' || roleOrPermission === 'deny') {
    return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
  }
  if (roleOrPermission === 'invited') {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

function getPermissionScope(roleId: string, permissionId: string) {
  return matrix.value[roleId]?.[permissionId] ?? ''
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Core Permission & RBAC"
      description="CRUD permission management dan kontrol akses disusun agar cepat dipakai admin enterprise."
    >
      <BaseButton variant="secondary" :disabled="rolesQuery.isFetching.value" @click="refreshAll">
        <RefreshCw class="size-4" :class="{ 'animate-spin': rolesQuery.isFetching.value }" />
        Refresh data
      </BaseButton>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <ShieldCheck class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Roles</p>
            <p class="text-2xl font-bold">{{ roles.length }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <KeyRound class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Permissions</p>
            <p class="text-2xl font-bold">{{ permissions.length }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">System roles</p>
            <p class="text-2xl font-bold">{{ systemRoleCount }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <Layers3 class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Matrix cells</p>
            <p class="text-2xl font-bold">{{ totalMatrixCells }}</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in [
          { key: 'overview', label: 'Overview' },
          { key: 'permissions', label: 'Permissions' },
          { key: 'roles', label: 'Roles' },
          { key: 'matrix', label: 'Matrix' },
        ]"
        :key="tab.key"
        class="border-b-2 px-4 py-2 text-sm font-medium transition-all"
        :class="
          activeTab === tab.key
            ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        "
        @click="activeTab = tab.key as RbacTab"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'overview'" class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <BaseCard class="space-y-4">
        <div class="flex items-center gap-2">
          <ShieldCheck class="size-5 text-brand-600" />
          <h2 class="text-lg font-semibold">Overview akses</h2>
        </div>
        <p class="text-sm text-gray-500">
          Permintaan enterprise biasanya butuh permission catalog yang rapi, konsisten, dan cepat
          dicari. Dari sini admin bisa membuat permission baru, memperbarui metadata, lalu melihat
          dampak ke matriks role.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="item in overviewStats"
            :key="item.label"
            class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900"
          >
            <p class="text-sm text-gray-500">{{ item.label }}</p>
            <p class="mt-1 text-2xl font-bold">{{ item.value }}</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="space-y-4">
        <div class="flex items-center gap-2">
          <PenLine class="size-5 text-brand-600" />
          <h2 class="text-lg font-semibold">Quick actions</h2>
        </div>
        <PermissionGate permission="permission.manage">
          <BaseButton class="w-full justify-center" @click="activeTab = 'permissions'">
            <Plus class="size-4" /> Buat permission
          </BaseButton>
        </PermissionGate>
        <BaseButton variant="secondary" class="w-full justify-center" @click="activeTab = 'matrix'">
          Lihat matrix role
        </BaseButton>
        <BaseButton variant="secondary" class="w-full justify-center" @click="activeTab = 'roles'">
          Lihat roles
        </BaseButton>
      </BaseCard>
    </div>

    <div v-else-if="activeTab === 'permissions'" class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <BaseCard class="!p-0">
        <div
          class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="text-lg font-semibold">Permission catalog</h2>
            <p class="text-sm text-gray-500">
              Klik item untuk edit. Filter module membantu admin menemukan permission lebih cepat.
            </p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label class="relative w-full sm:w-72">
              <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="search"
                placeholder="Cari permission..."
                class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              />
            </label>
            <select
              v-model="selectedModule"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950 sm:w-44"
            >
              <option v-for="module in modules" :key="module" :value="module">
                {{ module === 'all' ? 'Semua module' : module }}
              </option>
            </select>
            <PermissionGate permission="permission.manage">
              <BaseButton @click="createNewPermission"><Plus class="size-4" /> New</BaseButton>
            </PermissionGate>
          </div>
        </div>

        <div class="grid gap-3 p-5">
          <article
            v-for="permission in filteredPermissions"
            :key="permission.id"
            class="cursor-pointer rounded-2xl border p-4 transition hover:border-brand-300 hover:bg-brand-50/30 dark:hover:border-brand-800 dark:hover:bg-brand-950/20"
            :class="
              selectedPermissionId === permission.id
                ? 'border-brand-300 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-950/30'
                : 'bg-gray-50 dark:bg-gray-900'
            "
            @click="selectPermission(permission)"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-semibold text-gray-900 dark:text-white">{{ permission.name }}</h3>
                  <span
                    class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:ring-gray-800"
                  >
                    {{ permission.slug }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  module: <span class="font-medium">{{ permission.module }}</span> · action:
                  <span class="font-medium">{{ permission.action }}</span>
                </p>
                <p
                  v-if="permission.description"
                  class="mt-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  {{ permission.description }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="statusTone(permission.action)"
                >
                  {{ permission.action }}
                </span>
                <PermissionGate permission="permission.manage">
                  <BaseButton variant="secondary" @click.stop="selectPermission(permission)">
                    <PenLine class="size-4" /> Edit
                  </BaseButton>
                </PermissionGate>
              </div>
            </div>
          </article>

          <div
            v-if="!filteredPermissions.length"
            class="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500"
          >
            Tidak ada permission yang cocok.
          </div>
        </div>
      </BaseCard>

      <BaseCard class="sticky top-6 space-y-4 self-start">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">
              {{ permissionFormMode === 'create' ? 'Create permission' : 'Edit permission' }}
            </h2>
            <p class="text-sm text-gray-500">
              {{
                permissionFormMode === 'create'
                  ? 'Buat permission baru. Nama dipakai untuk generate slug dan action.'
                  : 'Edit metadata permission. Nama tidak diubah karena mengikuti kontrak backend.'
              }}
            </p>
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="
              permissionFormMode === 'create'
                ? 'bg-brand-50 text-brand-700'
                : 'bg-gray-100 text-gray-700'
            "
          >
            {{ permissionFormMode === 'create' ? 'New' : 'Selected' }}
          </span>
        </div>

        <div class="space-y-4">
          <label v-if="permissionFormMode === 'create'" class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Permission name
            </span>
            <input
              v-model="formName"
              type="text"
              class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              placeholder="billing.invoice.read"
            />
          </label>

          <label v-else class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Permission name
            </span>
            <input
              :value="selectedPermission?.name || ''"
              type="text"
              disabled
              class="w-full rounded-lg border bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500 outline-none dark:bg-gray-900"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </span>
            <textarea
              v-model="formDescription"
              rows="4"
              class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              placeholder="Jelaskan fungsi permission ini..."
            />
          </label>

          <details class="rounded-xl border bg-gray-50 p-4 dark:bg-gray-900">
            <summary class="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              Advanced mapping
            </summary>
            <div class="mt-4 space-y-3">
              <label class="block">
                <span class="mb-1.5 block text-xs font-medium text-gray-500">module_id</span>
                <input
                  v-model="formModuleId"
                  type="text"
                  class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  placeholder="UUID module jika tersedia"
                />
              </label>
              <p class="text-xs text-gray-500">
                Field ini opsional. Jika kosong, backend akan menurunkan module/action dari nama
                permission.
              </p>
            </div>
          </details>

          <div
            v-if="selectedPermission"
            class="rounded-xl border bg-gray-50 p-4 text-sm dark:bg-gray-900"
          >
            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Slug</span>
                <span class="font-medium">{{ selectedPermission.slug }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Module</span>
                <span class="font-medium">{{ selectedPermission.module }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Action</span>
                <span class="font-medium">{{ selectedPermission.action }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Updated</span>
                <span class="font-medium">{{ selectedPermission.updated_at || '-' }}</span>
              </div>
            </div>
          </div>

          <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ formError }}
          </p>

          <div class="flex flex-wrap gap-3">
            <PermissionGate permission="permission.manage">
              <BaseButton
                class="flex-1 justify-center"
                :disabled="
                  createPermissionMut.isPending.value || updatePermissionMut.isPending.value
                "
                @click="savePermission"
              >
                <RefreshCw
                  v-if="createPermissionMut.isPending.value || updatePermissionMut.isPending.value"
                  class="size-4 animate-spin"
                />
                <Plus v-else-if="permissionFormMode === 'create'" class="size-4" />
                <PenLine v-else class="size-4" />
                {{
                  createPermissionMut.isPending.value || updatePermissionMut.isPending.value
                    ? 'Menyimpan...'
                    : permissionFormMode === 'create'
                      ? 'Create'
                      : 'Save changes'
                }}
              </BaseButton>
            </PermissionGate>
            <BaseButton
              variant="secondary"
              class="flex-1 justify-center"
              @click="createNewPermission"
            >
              Reset
            </BaseButton>
            <PermissionGate permission="permission.manage">
              <BaseButton
                v-if="selectedPermission"
                variant="danger"
                class="w-full justify-center"
                :disabled="deletePermissionMut.isPending.value"
                @click="deleteSelectedPermission"
              >
                <Trash2 class="size-4" />
                Delete
              </BaseButton>
            </PermissionGate>
          </div>
        </div>
      </BaseCard>
    </div>

    <div v-else-if="activeTab === 'roles'" class="grid gap-6 xl:grid-cols-2">
      <BaseCard>
        <div class="flex items-center gap-2">
          <ShieldCheck class="size-5 text-brand-600" />
          <h2 class="text-lg font-semibold">Roles</h2>
        </div>
        <div class="mt-4 grid gap-3">
          <article
            v-for="role in roles"
            :key="role.id"
            class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold">{{ role.name }}</h3>
                <p class="text-sm text-gray-500">{{ role.slug }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="role.is_system ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-700'"
              >
                {{ role.is_system ? 'system' : 'custom' }}
              </span>
            </div>
            <p v-if="role.description" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {{ role.description }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="permission in role.permissions?.slice(0, 6) || []"
                :key="permission.id"
                class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:ring-gray-800"
              >
                {{ permission.slug }}
              </span>
              <span
                v-if="(role.permissions?.length || 0) > 6"
                class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:ring-gray-800"
              >
                +{{ (role.permissions?.length || 0) - 6 }}
              </span>
            </div>
          </article>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="flex items-center gap-2">
          <KeyRound class="size-5 text-brand-600" />
          <h2 class="text-lg font-semibold">Grouped permissions</h2>
        </div>
        <div class="mt-4 space-y-3">
          <article
            v-for="[module, items] in filteredGroupedPermissions"
            :key="module"
            class="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="font-semibold capitalize">{{ module }}</h3>
                <p class="text-sm text-gray-500">{{ items.length }} permission</p>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="permission in items"
                :key="permission.id"
                class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:ring-gray-800"
              >
                {{ permission.slug }}
              </span>
            </div>
          </article>
        </div>
      </BaseCard>
    </div>

    <BaseCard v-else class="!p-0">
      <div class="border-b p-5">
        <h2 class="text-lg font-semibold">Permission matrix</h2>
        <p class="text-sm text-gray-500">
          Melihat scope permission per role dalam satu tabel yang bisa dipindai cepat.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full border-separate border-spacing-0">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wider text-gray-500">
              <th class="sticky left-0 z-10 border-b bg-white px-5 py-3 dark:bg-gray-900">
                Permission
              </th>
              <th v-for="role in matrixColumns" :key="role.id" class="border-b px-5 py-3">
                <div class="min-w-40">
                  <p class="font-semibold normal-case text-gray-900 dark:text-white">
                    {{ role.name }}
                  </p>
                  <p class="mt-1 normal-case text-gray-500">{{ role.slug }}</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="permission in filteredPermissions" :key="permission.id" class="align-top">
              <td class="sticky left-0 z-10 border-b bg-white px-5 py-4 dark:bg-gray-900">
                <p class="font-medium">{{ permission.name }}</p>
                <p class="text-sm text-gray-500">{{ permission.slug }}</p>
              </td>
              <td
                v-for="role in matrixColumns"
                :key="`${role.id}:${permission.id}`"
                class="border-b px-5 py-4"
              >
                <span
                  v-if="getPermissionScope(role.id, permission.id)"
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="statusTone(getPermissionScope(role.id, permission.id))"
                >
                  {{ getPermissionScope(role.id, permission.id) }}
                </span>
                <span v-else class="text-sm text-gray-300">-</span>
              </td>
            </tr>
            <tr v-if="!filteredPermissions.length">
              <td :colspan="matrixColumns.length + 1" class="px-5 py-12 text-center text-gray-500">
                Tidak ada permission yang cocok dengan filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
