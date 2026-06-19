<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Customer Management"
      description="Kelola seluruh customer dan penyewa platform (Tenant)."
    />

    <div
      class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200 flex items-start gap-4"
    >
      <AlertCircle class="size-6 shrink-0 mt-0.5" />
      <div>
        <h3 class="font-bold text-lg mb-1">Menunggu Integrasi OpenAPI</h3>
        <p>
          Modul Customer belum memiliki spesifikasi OpenAPI yang siap dikonsumsi. Fitur pengelolaan
          customer (CRUD) akan ditambahkan setelah kontrak backend selesai dirancang.
        </p>
      </div>
    </div>
  </div>
</template>
