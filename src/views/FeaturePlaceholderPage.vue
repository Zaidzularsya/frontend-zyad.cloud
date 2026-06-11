<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="title" :description="description" />
    <BaseCard>
      <p class="text-sm text-gray-500">
        Modul ini sudah memiliki batas route, layout, tenant, dan permission. Implementasi use-case
        dapat ditambahkan di
        <code class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">src/features</code>.
      </p>
    </BaseCard>
  </div>
</template>
