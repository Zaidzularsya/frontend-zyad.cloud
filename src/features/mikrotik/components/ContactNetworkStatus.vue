<script setup lang="ts">
import { computed } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import { useMikrotikEnabled } from '@/features/mikrotik/composables/useMikrotikEnabled'
import NetworkStatusCard from '@/features/mikrotik/components/NetworkStatusCard.vue'
import { useAccountByContactQuery } from '@/features/receivable/api/receivable.queries'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps<{ contactId: string; contactName?: string }>()

const auth = useAuthStore()
const mikrotikOn = useMikrotikEnabled()
const visible = computed(() => mikrotikOn.value && auth.can('mikrotik_policy.read'))

const contactIdRef = computed(() => props.contactId)
const accountQuery = useAccountByContactQuery(contactIdRef, visible)
const account = computed(() => accountQuery.data.value)
</script>

<template>
  <template v-if="visible">
    <NetworkStatusCard v-if="account" :account-id="account.id" :contact-name="contactName" />
    <BaseCard v-else-if="accountQuery.isSuccess.value" class="!p-5">
      <h2 class="text-sm font-semibold">Status Jaringan</h2>
      <p class="mt-2 text-sm text-gray-500">Kontak ini belum menjadi pelanggan penagihan</p>
    </BaseCard>
  </template>
</template>
