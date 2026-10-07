<script setup lang="ts">
import { env } from '@/config/env'
import type { GrapesChrome } from '../grapes/chrome'
import GrapesPageFrame from './GrapesPageFrame.vue'
import ShadowPageRenderer from '../shadow/ShadowPageRenderer.vue'

/**
 * Memilih renderer halaman GrapesJS menurut VITE_LANDING_RENDERER:
 * `shadow` (default) = Shadow DOM, `iframe` = renderer lama (rollback).
 */
defineProps<{
  html: string
  css: string
  chrome?: GrapesChrome
  title?: string
}>()
</script>

<template>
  <GrapesPageFrame
    v-if="env.VITE_LANDING_RENDERER === 'iframe'"
    :html="html"
    :css="css"
    :chrome="chrome"
    :title="title"
  />
  <ShadowPageRenderer v-else :html="html" :css="css" :chrome="chrome" :title="title" />
</template>
