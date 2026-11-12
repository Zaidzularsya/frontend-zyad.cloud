<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Search } from 'lucide-vue-next'

import { contactsApi } from '@/features/crm/contacts/api/contacts.api'
import type { OnboardContactRef } from '@/features/mikrotik/types'

// Mencari kontak CRM (bukan akun receivable): akun dibuat otomatis saat SO onboarding ditagih.
const props = defineProps<{ initialQuery?: string }>()
const emit = defineEmits<{ (e: 'pick', contact: OnboardContactRef): void }>()

const input = ref(props.initialQuery ?? '')
const query = ref(input.value.trim())
let timer: ReturnType<typeof setTimeout> | undefined
watch(input, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (query.value = value.trim()), 300)
})
onBeforeUnmount(() => clearTimeout(timer))

const enabled = computed(() => query.value.length >= 2)
const results = useQuery({
  enabled,
  queryKey: computed(() => ['mikrotik', 'onboard-contact-search', query.value]),
  queryFn: () => contactsApi.list({ page: 1, per_page: 10, search: query.value }),
})

const contacts = computed<OnboardContactRef[]>(() =>
  (results.data.value?.data ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(' '),
    email: c.email ?? '',
    phone: c.phone ?? '',
  })),
)
</script>

<template>
  <div class="space-y-2">
    <label class="relative block text-sm">
      <span class="sr-only">Cari kontak CRM</span>
      <Search class="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
      <input
        v-model="input"
        name="contact_search"
        placeholder="Cari nama, email, atau nomor WhatsApp"
        class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 outline-none focus:border-brand-500 dark:bg-gray-950"
      />
    </label>
    <p v-if="!enabled" class="text-xs text-gray-500">Ketik minimal 2 huruf.</p>
    <p v-else-if="results.isFetching.value" class="text-xs text-gray-500" role="status">
      Mencari kontak…
    </p>
    <p v-else-if="results.isError.value" class="text-xs text-red-600" role="alert">
      Gagal mencari kontak. Coba lagi.
    </p>
    <p v-else-if="contacts.length === 0" class="text-xs text-gray-500">Kontak tidak ditemukan.</p>
    <ul v-else class="max-h-60 divide-y overflow-auto rounded-lg border">
      <li v-for="c in contacts" :key="c.id" class="flex items-center justify-between gap-3 p-2">
        <div class="min-w-0 text-sm">
          <p class="truncate font-medium">{{ c.name }}</p>
          <p class="truncate text-xs text-gray-500">
            {{ [c.email, c.phone].filter(Boolean).join(' · ') || 'Tanpa email/WA' }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50"
          :data-testid="`pick-contact-${c.id}`"
          @click="emit('pick', c)"
        >
          Pilih
        </button>
      </li>
    </ul>
  </div>
</template>
