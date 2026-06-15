<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { X } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { z } from 'zod'

import BaseButton from '@/components/ui/BaseButton.vue'
import TextField from '@/components/form/TextField.vue'
import type { UserDetail } from '@/features/users/api/users.api'
import { useRolesQuery } from '@/features/users/api/users.queries'

const props = defineProps<{
  isOpen: boolean
  userToEdit: UserDetail | null
}>()

const emit = defineEmits<{
  close: []
  submit: [values: Record<string, unknown>]
}>()

const isEdit = computed(() => Boolean(props.userToEdit))

const rolesQuery = useRolesQuery()

const schema = toTypedSchema(
  z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Email tidak valid'),
    username: z.string().min(3, 'Username minimal 3 karakter'),
    phone: z.string().optional().or(z.literal('')),
    job_title: z.string().optional().or(z.literal('')),
    department: z.string().optional().or(z.literal('')),
    password: z.string().optional().or(z.literal('')),
    status: z.enum(['active', 'pending', 'inactive', 'invited']).optional().default('active'),
    role_id: z.string().optional().or(z.literal('')),
    send_invitation: z.boolean().optional().default(false),
  }),
)

const { defineField, errors, handleSubmit, resetForm, isSubmitting, setFieldError } = useForm({
  validationSchema: schema,
})

// Initialize form values when opening or changing userToEdit
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.userToEdit) {
        resetForm({
          values: {
            name: props.userToEdit.name,
            email: props.userToEdit.email,
            username: props.userToEdit.username,
            phone: props.userToEdit.phone || '',
            job_title: props.userToEdit.profile?.job_title || '',
            department: props.userToEdit.profile?.department || '',
            password: '',
            status: 'active',
            role_id: '',
            send_invitation: false,
          },
        })
      } else {
        resetForm({
          values: {
            name: '',
            email: '',
            username: '',
            phone: '',
            job_title: '',
            department: '',
            password: '',
            status: 'active',
            role_id: '',
            send_invitation: false,
          },
        })
      }
    }
  },
  { immediate: true },
)

const [name] = defineField('name')
const [email] = defineField('email')
const [username] = defineField('username')
const [phone] = defineField('phone')
const [password] = defineField('password')
const [status] = defineField('status')
const [role_id] = defineField('role_id')
const [send_invitation] = defineField('send_invitation')
const [job_title] = defineField('job_title')
const [department] = defineField('department')

const onSubmit = handleSubmit((values) => {
  if (!isEdit.value && !values.role_id) {
    setFieldError('role_id', 'Role wajib dipilih')
    return
  }
  emit('submit', values)
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl dark:bg-gray-900 transition-all"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-6 py-4">
        <h2 class="text-lg font-bold">
          {{ isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru' }}
        </h2>
        <button
          class="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="emit('close')"
        >
          <X class="size-5" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit="onSubmit">
        <div class="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          <TextField
            v-model="name"
            name="name"
            label="Nama Lengkap"
            placeholder="Jane Doe"
            :error="errors.name"
          />

          <div class="grid gap-4 sm:grid-cols-2">
            <TextField
              v-model="email"
              name="email"
              label="Email"
              type="email"
              placeholder="jane@example.com"
              :error="errors.email"
            />
            <TextField
              v-model="username"
              name="username"
              label="Username"
              placeholder="jane.doe"
              :error="errors.username"
            />
          </div>

          <TextField
            v-model="phone"
            name="phone"
            label="Nomor Telepon/WhatsApp"
            placeholder="+628123456789"
            :error="errors.phone"
          />

          <!-- Edit Mode Fields -->
          <div v-if="isEdit" class="grid gap-4 sm:grid-cols-2">
            <TextField
              v-model="job_title"
              name="job_title"
              label="Jabatan (Job Title)"
              placeholder="Manager"
              :error="errors.job_title"
            />
            <TextField
              v-model="department"
              name="department"
              label="Departemen"
              placeholder="Marketing"
              :error="errors.department"
            />
          </div>

          <!-- Create Mode Fields -->
          <div v-else class="space-y-4">
            <TextField
              v-model="password"
              name="password"
              label="Password (Opsional)"
              type="password"
              placeholder="Minimal 8 karakter"
              :error="errors.password"
            />
            <p class="text-xs text-gray-500">
              Biarkan kosong untuk membiarkan pengguna mengatur kata sandi mereka sendiri via tautan
              undangan.
            </p>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role Awal
                </span>
                <select
                  v-model="role_id"
                  class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  :class="{ 'border-red-500': errors.role_id }"
                >
                  <option value="" disabled>Pilih Role</option>
                  <option v-for="role in rolesQuery.data.value" :key="role.id" :value="role.id">
                    {{ role.name }} ({{ role.slug }})
                  </option>
                </select>
                <span v-if="errors.role_id" class="mt-1 block text-xs text-red-600">{{
                  errors.role_id
                }}</span>
              </label>

              <label class="block">
                <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status Awal
                </span>
                <select
                  v-model="status"
                  class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                >
                  <option value="active">Aktif</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="invited">Undangan</option>
                </select>
              </label>
            </div>

            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                v-model="send_invitation"
                type="checkbox"
                class="size-4 rounded border-gray-300 accent-brand-500"
              />
              Kirim tautan undangan ke email pengguna
            </label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex items-center justify-end gap-3 border-t px-6 py-4 bg-gray-50 dark:bg-gray-900/50"
        >
          <BaseButton variant="secondary" :disabled="isSubmitting" @click="emit('close')">
            Batal
          </BaseButton>
          <BaseButton type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
