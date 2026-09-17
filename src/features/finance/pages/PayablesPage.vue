<script setup lang="ts">
import ARAPTransactionsPanel from '@/features/finance/components/ARAPTransactionsPanel.vue'
</script>

<template>
  <ARAPTransactionsPanel
    transaction-type="payable"
    title="Utang Usaha"
    description="Tagihan pemasok, status pembayaran, dan aging utang."
    create-button-label="Tagihan Baru"
  />
</template>
