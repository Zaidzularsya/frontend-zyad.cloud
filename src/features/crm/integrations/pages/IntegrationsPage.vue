<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Package, Plus, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import {
  integrationsApi,
  type Integration,
  type IntegrationProvider,
} from '@/features/crm/integrations/api/integrations.api'
import {
  useConnectIntegrationMutation,
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationsQuery,
  useUpdateIntegrationSecretMutation,
} from '@/features/crm/integrations/api/integrations.queries'

const providerLabels: Record<IntegrationProvider, string> = {
  webhook: 'Webhook',
  whatsapp: 'WhatsApp',
  email: 'Email',
  zapier: 'Zapier',
}

const params = computed(() => ({ page: 1, per_page: 50 }))
const integrationsQuery = useIntegrationsQuery(params)
const integrations = computed(() => integrationsQuery.data.value?.data ?? [])

const createMutation = useCreateIntegrationMutation()
const deleteMutation = useDeleteIntegrationMutation()
const connectMutation = useConnectIntegrationMutation()
const updateSecretMutation = useUpdateIntegrationSecretMutation()

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

async function handleDelete(integration: Integration) {
  if (!confirm(`Hapus integration "${integration.name}"?`)) return
  await deleteMutation.mutateAsync(integration.id)
}

async function handleConnect(integration: Integration) {
  await connectMutation.mutateAsync(integration.id)
}

async function handleRevealSecret(integration: Integration) {
  try {
    const secret = await integrationsApi.revealSecret(integration.id)
    alert(secret ? `Secret: ${secret}` : 'Integration ini belum punya secret.')
  } catch (error) {
    alert(extractError(error))
  }
}

async function handleUpdateSecret(integration: Integration) {
  const secret = prompt(`Secret baru untuk "${integration.name}":`)
  if (!secret) return
  try {
    await updateSecretMutation.mutateAsync({ id: integration.id, secret })
  } catch (error) {
    alert(extractError(error))
  }
}

// --- Create modal ---
const isModalOpen = ref(false)
const errorMessage = ref('')
const form = reactive({
  provider: 'webhook' as IntegrationProvider,
  name: '',
  secret: '',
})

function openCreateModal() {
  form.provider = 'webhook'
  form.name = ''
  form.secret = ''
  errorMessage.value = ''
  isModalOpen.value = true
}

async function submitForm() {
  errorMessage.value = ''
  try {
    await createMutation.mutateAsync({ ...form })
    isModalOpen.value = false
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Integrations"
      description="Koneksi CRM ke sistem eksternal (webhook, WhatsApp, dll)."
    >
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Integration Baru
      </BaseButton>
    </PageHeader>

    <BaseCard class="!p-0">
      <div v-if="integrationsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="integrations.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Package class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada integration.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nama</th>
              <th class="px-5 py-3">Provider</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="integration in integrations"
              :key="integration.id"
              class="border-b last:border-0"
            >
              <td class="px-5 py-3 font-medium">{{ integration.name }}</td>
              <td class="px-5 py-3 text-gray-500">{{ providerLabels[integration.provider] }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    integration.is_active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  "
                >
                  {{ integration.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    v-if="!integration.is_active"
                    variant="outline"
                    @click="handleConnect(integration)"
                  >
                    Connect
                  </BaseButton>
                  <BaseButton variant="outline" @click="handleRevealSecret(integration)">
                    Lihat Secret
                  </BaseButton>
                  <BaseButton variant="outline" @click="handleUpdateSecret(integration)">
                    Ganti Secret
                  </BaseButton>
                  <BaseButton variant="danger" @click="handleDelete(integration)">
                    <Trash2 class="size-4" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <BaseModal :open="isModalOpen" title="Integration Baru" @close="isModalOpen = false">
      <form class="space-y-4" @submit.prevent="submitForm">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Provider</span
          >
          <select
            v-model="form.provider"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option v-for="(label, value) in providerLabels" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>
        <TextField
          v-model="form.name"
          name="name"
          label="Nama"
          placeholder="Webhook CRM ke Sistem X"
        />
        <TextField v-model="form.secret" name="secret" label="Secret (opsional)" type="password" />

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton type="button" variant="secondary" @click="isModalOpen = false"
            >Batal</BaseButton
          >
          <BaseButton type="submit" :disabled="createMutation.isPending.value">
            {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
