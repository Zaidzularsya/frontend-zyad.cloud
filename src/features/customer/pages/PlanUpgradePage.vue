<script setup lang="ts">
import { CreditCard } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Plan & Billing" description="Kelola paket berlangganan workspace Anda." />

    <BaseCard class="text-center py-10">
      <CreditCard class="size-10 text-gray-400 mx-auto mb-4" />
      <h3 class="font-semibold text-lg">Anda berada di Paket Basic</h3>
      <p class="text-sm text-gray-500 mt-2 max-w-md mx-auto">
        Upgrade paket Anda untuk membuka akses ke kustomisasi domain, kuota form yang lebih tinggi,
        dan prioritas antrean dukungan.
      </p>
      <button
        class="mt-6 rounded-lg bg-brand-600 px-6 py-2 font-medium text-white hover:bg-brand-500 transition-colors"
      >
        Upgrade ke Pro
      </button>
    </BaseCard>
  </div>
</template>
