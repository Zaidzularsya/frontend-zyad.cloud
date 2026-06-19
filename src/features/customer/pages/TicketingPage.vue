<script setup lang="ts">
import { LifeBuoy } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Support & Ticketing"
      description="Hubungi tim dukungan jika Anda mengalami masalah."
    />

    <BaseCard>
      <div class="flex items-center gap-3 mb-4">
        <LifeBuoy class="size-5 text-gray-500" />
        <h3 class="font-semibold">Riwayat Tiket</h3>
      </div>
      <p class="text-sm text-gray-500">Belum ada tiket support yang terbuka.</p>
      <button class="mt-4 text-sm font-medium text-brand-600 hover:text-brand-500">
        + Buat Tiket Baru
      </button>
    </BaseCard>
  </div>
</template>
