<script setup lang="ts">
import { safeHref, type GrapesChrome } from '../../grapes/chrome'

defineProps<{
  host: HTMLElement
  chrome: GrapesChrome
  dataset: Record<string, string>
}>()

function isNewTab(target?: string): boolean {
  return target === 'new_tab' || target === '_blank'
}
</script>

<template>
  <div v-if="chrome.footer" class="zyad-tenant-footer">
    <div class="zyad-tenant-footer__top">
      <div class="zyad-tenant-footer__brand">
        <img
          v-if="chrome.footer.logoUrl"
          :src="safeHref(chrome.footer.logoUrl)"
          :alt="chrome.footer.brandName || ''"
        />
        <span v-if="chrome.footer.brandName">{{ chrome.footer.brandName }}</span>
      </div>
      <div
        v-for="(column, ci) in chrome.footer.columns ?? []"
        :key="ci"
        class="zyad-tenant-footer__col"
      >
        <p class="zyad-tenant-footer__title">{{ column.title }}</p>
        <nav>
          <a
            v-for="(link, li) in column.links"
            :key="li"
            :href="safeHref(link.href)"
            :target="isNewTab(link.target) ? '_blank' : undefined"
            :rel="isNewTab(link.target) ? 'noopener noreferrer' : undefined"
          >
            {{ link.label }}
          </a>
        </nav>
      </div>
    </div>
    <p v-if="chrome.footer.copyright" class="zyad-tenant-footer__copyright">
      {{ chrome.footer.copyright }}
    </p>
  </div>
</template>
