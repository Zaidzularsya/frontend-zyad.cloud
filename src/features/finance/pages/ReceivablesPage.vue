<script setup lang="ts">
import ARAPTransactionsPanel from '@/features/finance/components/ARAPTransactionsPanel.vue'
</script>

<template>
  <ARAPTransactionsPanel
    transaction-type="receivable"
    title="Piutang Usaha"
    description="Invoice pelanggan, status pembayaran, dan aging piutang."
    create-button-label="Invoice Baru"
  />
</template>
