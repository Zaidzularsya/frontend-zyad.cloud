<script setup lang="ts">
import { ref } from 'vue'

import AccountPicker from '@/features/mikrotik/components/AccountPicker.vue'
import type { AccountRef, PppSecret } from '@/features/mikrotik/types'

const props = defineProps<{
  rows: PppSecret[]
  mode: 'unpaired' | 'paired'
  /** secretId -> accountId untuk baris yang dipilih. */
  selected: Map<string, string>
  /** accountId -> nama pelanggan yang dipilih manual lewat AccountPicker. */
  accountNames?: Record<string, string>
  /** secretId -> pesan galat dari pairing yang gagal. */
  failures: Record<string, string>
  searchText?: string
  canPair: boolean
  canUnpair: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', row: PppSecret): void
  (e: 'pick', row: PppSecret, account: AccountRef): void
  (e: 'clear', row: PppSecret): void
  (e: 'new-customer', row: PppSecret): void
  (e: 'set-profile', row: PppSecret, profile: string): void
  (e: 'unpair', row: PppSecret): void
}>()

const ISOLATED_HINT =
  'Secret ini sedang terisolir. Lepas pasangan setelah pelanggan lunas atau dikecualikan.'

const BASIS_LABEL: Record<string, string> = {
  phone: 'Nomor HP',
  name: 'Nama',
  ambiguous: 'Nama ganda',
}

const pickerFor = ref<string | null>(null)
const profileFor = ref<string | null>(null)
const profileInput = ref('')

type Tone = 'green' | 'yellow' | 'red' | 'none'
function tone(row: PppSecret): Tone {
  if (props.mode === 'paired') return 'none'
  if (row.needs_original_profile) return 'red'
  const s = row.suggestion
  if (props.selected.has(row.id) || (s && s.basis !== 'ambiguous' && s.account_id)) return 'green'
  if (s) return 'yellow'
  return 'none'
}
const ROW_CLASS: Record<Tone, string> = {
  green: 'bg-green-50 dark:bg-green-950/30',
  yellow: 'bg-yellow-50 dark:bg-yellow-950/30',
  red: 'bg-red-50 dark:bg-red-950/30',
  none: '',
}

function accountFor(row: PppSecret): string {
  return props.selected.get(row.id) ?? row.suggestion?.account_id ?? ''
}
// Label diturunkan dari akun yang benar-benar terpilih (yang akan dikirim), bukan dari baris.
function customerLabel(row: PppSecret): string {
  const s = row.suggestion
  const suggestionLabel = () =>
    !s
      ? '-'
      : s.basis === 'ambiguous'
        ? `${s.candidates} kandidat`
        : `${s.account_name} (${s.account_phone})`
  const chosen = props.selected.get(row.id)
  if (!chosen) return suggestionLabel()
  if (s && s.basis !== 'ambiguous' && s.account_id === chosen) return suggestionLabel()
  return props.accountNames?.[chosen] ?? 'Pelanggan dipilih'
}

function onPick(row: PppSecret, account: AccountRef) {
  pickerFor.value = null
  emit('pick', row, account)
}
function openProfile(row: PppSecret) {
  profileFor.value = row.id
  profileInput.value = ''
}
function saveProfile(row: PppSecret) {
  const value = profileInput.value.trim()
  if (!value) return
  profileFor.value = null
  emit('set-profile', row, value)
}
</script>

<template>
  <table class="w-full min-w-[820px] text-left text-sm">
    <thead
      class="sticky top-0 z-10 border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900"
    >
      <tr>
        <th v-if="mode === 'unpaired'" class="w-10 px-4 py-3">
          <span class="sr-only">Pilih</span>
        </th>
        <th class="px-4 py-3">Secret</th>
        <th class="px-4 py-3">Profile</th>
        <template v-if="mode === 'unpaired'">
          <th class="px-4 py-3">Usulan pelanggan</th>
          <th class="px-4 py-3">Dasar cocok</th>
        </template>
        <th v-else class="px-4 py-3">Pelanggan</th>
        <th class="px-4 py-3">Aksi</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.id"
        class="border-b align-top last:border-0"
        :class="ROW_CLASS[tone(row)]"
      >
        <td v-if="mode === 'unpaired'" class="px-4 py-3">
          <input
            type="checkbox"
            class="size-4 rounded border-gray-300"
            :aria-label="`Pilih ${row.name}`"
            :checked="selected.has(row.id)"
            :disabled="!canPair || row.needs_original_profile || !accountFor(row)"
            @change="emit('toggle', row)"
          />
        </td>
        <td class="px-4 py-3 font-medium">
          {{ row.name }}
          <span
            v-if="failures[row.id]"
            class="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
            :title="failures[row.id]"
            >Gagal: {{ failures[row.id] }}</span
          >
        </td>
        <td class="px-4 py-3">
          {{ row.profile }}
          <span v-if="row.needs_original_profile" class="block text-xs text-red-700"
            >Perlu profile asli</span
          >
        </td>
        <template v-if="mode === 'unpaired'">
          <td class="px-4 py-3">{{ customerLabel(row) }}</td>
          <td class="px-4 py-3">
            {{ row.suggestion ? (BASIS_LABEL[row.suggestion.basis] ?? row.suggestion.basis) : '-' }}
          </td>
        </template>
        <td v-else class="px-4 py-3">
          <span v-if="row.account_name">{{ row.account_name }}</span>
          <span v-else class="text-gray-400" :title="row.account_id ?? undefined"
            >Pelanggan tidak ditemukan</span
          >
        </td>
        <td class="relative px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <template v-if="mode === 'paired'">
              <button
                type="button"
                class="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canUnpair || row.isolation_state === 'isolated'"
                :title="row.isolation_state === 'isolated' ? ISOLATED_HINT : undefined"
                @click="emit('unpair', row)"
              >
                Lepas
              </button>
            </template>
            <template v-else-if="row.needs_original_profile">
              <template v-if="profileFor === row.id">
                <input
                  v-model="profileInput"
                  :aria-label="`Profile asli untuk ${row.name}`"
                  class="w-32 rounded-lg border bg-white px-2 py-1 text-xs dark:bg-gray-950"
                  placeholder="Nama profile"
                  @keydown.enter="saveProfile(row)"
                />
                <button
                  type="button"
                  class="text-xs font-medium text-brand-600"
                  @click="saveProfile(row)"
                >
                  Simpan
                </button>
              </template>
              <button
                v-else
                type="button"
                class="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                :disabled="!canPair"
                @click="openProfile(row)"
              >
                Pilih profile asli
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                :disabled="!canPair"
                @click="pickerFor = row.id"
              >
                {{ accountFor(row) ? 'Ganti pelanggan' : 'Pilih pelanggan' }}
              </button>
              <button
                type="button"
                class="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                :disabled="!canPair"
                @click="emit('new-customer', row)"
              >
                Buat pelanggan baru
              </button>
              <button
                v-if="selected.has(row.id)"
                type="button"
                class="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                :aria-label="`Batalkan pilihan ${row.name}`"
                @click="emit('clear', row)"
              >
                X
              </button>
            </template>
          </div>
          <div v-if="pickerFor === row.id" class="absolute right-4 z-20 mt-1">
            <AccountPicker
              :initial-query="searchText"
              :label="`Cari pelanggan untuk ${row.name}`"
              @pick="(a) => onPick(row, a)"
              @cancel="pickerFor = null"
            />
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
