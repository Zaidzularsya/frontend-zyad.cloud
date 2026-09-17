<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pencil, Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BusinessPartnerFormModal from '@/features/finance/components/BusinessPartnerFormModal.vue'
import { useFinanceBusinessPartnersQuery } from '@/features/finance/api/business-partners.queries'
import type {
  FinanceBusinessPartner,
  FinancePartnerType,
} from '@/features/finance/api/business-partners.api'

const includeInactive = ref(false)
const partnerType = ref<FinancePartnerType | ''>('')
const listParams = computed(() => ({
  partner_type: partnerType.value || undefined,
  include_inactive: includeInactive.value,
}))
const partnersQuery = useFinanceBusinessPartnersQuery(listParams)

const modalOpen = ref(false)
const editingPartner = ref<FinanceBusinessPartner | null>(null)

function openCreate() {
  editingPartner.value = null
  modalOpen.value = true
}

function openEdit(partner: FinanceBusinessPartner) {
  editingPartner.value = partner
  modalOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Mitra Bisnis"
      description="Daftar pelanggan (piutang) dan pemasok (utang) beserta akun kontrol GL-nya."
    >
      <PermissionGate permission="platform.finance.arap.manage">
        <BaseButton @click="openCreate"> <Plus class="size-4" /> Mitra Baru </BaseButton>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <div class="mb-3 flex flex-wrap items-center gap-4">
        <label class="text-sm font-medium">
          Tipe
          <select
            v-model="partnerType"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          >
            <option value="">Semua</option>
            <option value="customer">Pelanggan</option>
            <option value="vendor">Pemasok</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="includeInactive" type="checkbox" />
          Tampilkan mitra nonaktif
        </label>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Kode</th>
            <th class="px-3 py-2">Nama</th>
            <th class="px-3 py-2">Tipe</th>
            <th class="px-3 py-2">Akun Kontrol</th>
            <th class="px-3 py-2">NPWP</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="partner in partnersQuery.data.value ?? []"
            :key="partner.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ partner.code }}</td>
            <td class="px-3 py-2">{{ partner.name }}</td>
            <td class="px-3 py-2">
              {{ partner.partner_type === 'customer' ? 'Pelanggan' : 'Pemasok' }}
            </td>
            <td class="px-3 py-2 text-gray-500">
              {{ partner.control_account_code }} — {{ partner.control_account_name }}
            </td>
            <td class="px-3 py-2 text-gray-500">{{ partner.tax_id }}</td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="
                  partner.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                "
              >
                {{ partner.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <PermissionGate permission="platform.finance.arap.manage">
                <button class="text-gray-400 hover:text-brand-600" @click="openEdit(partner)">
                  <Pencil class="size-4" />
                </button>
              </PermissionGate>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BusinessPartnerFormModal
      :open="modalOpen"
      :partner="editingPartner"
      @close="modalOpen = false"
      @saved="partnersQuery.refetch()"
    />
  </div>
</template>
