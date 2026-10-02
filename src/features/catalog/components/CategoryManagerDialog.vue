<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Pencil, Trash2, X } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import type { CatalogCategory } from '@/features/catalog/api/catalog.api'
import {
  useDeleteCategoryMutation,
  useSaveCategoryMutation,
} from '@/features/catalog/api/catalog.queries'
import { catalogErrorMessage } from '@/features/catalog/utils/errors'

const props = defineProps<{
  open: boolean
  categories: CatalogCategory[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const newName = ref('')
const editingId = ref('')
const editingName = ref('')
const errorMessage = ref('')

const saveMutation = useSaveCategoryMutation()
const deleteMutation = useDeleteCategoryMutation()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    newName.value = ''
    editingId.value = ''
    errorMessage.value = ''
  },
)

async function run(action: () => Promise<unknown>) {
  errorMessage.value = ''
  try {
    await action()
    return true
  } catch (error) {
    errorMessage.value = catalogErrorMessage(error)
    return false
  }
}

async function add() {
  const name = newName.value.trim()
  if (!name) return
  const position = props.categories.length
  if (await run(() => saveMutation.mutateAsync({ payload: { name, position } }))) {
    newName.value = ''
  }
}

function startEdit(category: CatalogCategory) {
  editingId.value = category.id
  editingName.value = category.name
}

async function saveEdit() {
  const name = editingName.value.trim()
  if (!name) return
  const id = editingId.value
  if (await run(() => saveMutation.mutateAsync({ id, payload: { name } }))) {
    editingId.value = ''
  }
}

async function remove(category: CatalogCategory) {
  if (
    !confirm(
      `Hapus kategori "${category.name}"? Produk di kategori ini akan menjadi tanpa kategori.`,
    )
  )
    return
  await run(() => deleteMutation.mutateAsync(category.id))
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal :open="open" title="Kategori produk" @close="emit('close')">
    <div class="space-y-4">
      <ul v-if="categories.length" class="divide-y rounded-lg border">
        <li v-for="category in categories" :key="category.id" class="flex items-center gap-2 p-2">
          <template v-if="editingId === category.id">
            <input
              v-model="editingName"
              :class="inputClass"
              maxlength="100"
              aria-label="Nama kategori"
              @keydown.enter.prevent="saveEdit"
            />
            <BaseButton variant="outline" aria-label="Simpan nama" @click="saveEdit">
              <Check class="size-4" />
            </BaseButton>
            <BaseButton variant="secondary" aria-label="Batal ubah" @click="editingId = ''">
              <X class="size-4" />
            </BaseButton>
          </template>
          <template v-else>
            <span class="flex-1 text-sm">{{ category.name }}</span>
            <BaseButton
              variant="outline"
              :aria-label="`Ubah ${category.name}`"
              @click="startEdit(category)"
            >
              <Pencil class="size-4" />
            </BaseButton>
            <BaseButton
              variant="danger"
              :aria-label="`Hapus ${category.name}`"
              @click="remove(category)"
            >
              <Trash2 class="size-4" />
            </BaseButton>
          </template>
        </li>
      </ul>
      <p v-else class="text-sm text-gray-500">Belum ada kategori.</p>

      <form class="flex gap-2" @submit.prevent="add">
        <input
          v-model="newName"
          :class="inputClass"
          maxlength="100"
          placeholder="Nama kategori baru"
          aria-label="Nama kategori baru"
        />
        <BaseButton type="submit" :disabled="saveMutation.isPending.value">Tambah</BaseButton>
      </form>

      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
    </div>
  </BaseModal>
</template>
