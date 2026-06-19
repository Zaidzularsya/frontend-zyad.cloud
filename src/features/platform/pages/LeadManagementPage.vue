<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Lead Management"
      description="Tinjau dan kelola calon customer (leads) yang masuk dari Public Landing Page."
    />

    <div
      class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200 flex items-start gap-4"
    >
      <AlertCircle class="size-6 shrink-0 mt-0.5" />
      <div>
        <h3 class="font-bold text-lg mb-1">Menunggu Integrasi OpenAPI</h3>
        <p>
          Modul Lead belum memiliki spesifikasi OpenAPI yang siap dikonsumsi. Data calon customer
          hasil registrasi social login akan ditampilkan di sini dan dapat Anda invite setelah API
          tersedia.
        </p>
      </div>
    </div>
  </div>
</template>
