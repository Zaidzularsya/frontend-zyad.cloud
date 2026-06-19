<script setup lang="ts">
import { Brush } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Branding Management"
      description="Sesuaikan logo, nama platform, dan palet warna utama."
    />

    <BaseCard>
      <div class="flex items-center gap-3 mb-4">
        <Brush class="size-5 text-gray-500" />
        <h3 class="font-semibold">Logo & Global Colors</h3>
      </div>
      <p class="text-sm text-gray-500">
        Antarmuka pengunggahan logo dan pemilihan hex warna brand akan muncul di sini.
      </p>
    </BaseCard>
  </div>
</template>
