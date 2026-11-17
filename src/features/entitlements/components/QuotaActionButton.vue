<script setup lang="ts">
import { useRouter } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'

import { useEntitlement } from '../composables/useEntitlement'
import { upgradeTarget } from '../utils/upgrade'

const props = defineProps<{
  featureKey: string
  label: string
  upgradeLabel: string
  disabled?: boolean
}>()

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const router = useRouter()
const { atLimit } = useEntitlement(() => props.featureKey)

function onClick(event: MouseEvent) {
  if (atLimit.value) {
    void router.push(upgradeTarget())
    return
  }
  emit('click', event)
}
</script>

<template>
  <BaseButton :disabled="disabled" @click="onClick">
    <slot v-if="!atLimit" name="icon" />
    {{ atLimit ? upgradeLabel : label }}
  </BaseButton>
</template>
