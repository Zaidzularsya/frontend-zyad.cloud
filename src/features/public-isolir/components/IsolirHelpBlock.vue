<script setup lang="ts">
import { Mail, MessageCircle, Phone } from 'lucide-vue-next'
import { computed } from 'vue'

import { telHref as toTelHref, whatsappUrl } from '@/lib/contact-links'

const props = defineProps<{ phone: string; email: string }>()

const waUrl = computed(() => whatsappUrl(props.phone))
const telHref = computed(() => toTelHref(props.phone))

const linkClass =
  'flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
</script>

<template>
  <section class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Bantuan</h2>
    <div class="mt-3 grid gap-2">
      <a v-if="phone" :href="telHref" :class="linkClass">
        <Phone class="size-4" aria-hidden="true" /> {{ phone }}
      </a>
      <a v-if="waUrl" :href="waUrl" target="_blank" rel="noopener noreferrer" :class="linkClass">
        <MessageCircle class="size-4" aria-hidden="true" /> WhatsApp
      </a>
      <a v-if="email" :href="`mailto:${email}`" :class="linkClass">
        <Mail class="size-4" aria-hidden="true" /> {{ email }}
      </a>
    </div>
  </section>
</template>
