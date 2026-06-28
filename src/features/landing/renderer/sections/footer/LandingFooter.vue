<script setup lang="ts">
defineProps<{
  content: {
    brandName: string
    description: string
    columns: Array<{
      title: string
      links: Array<{
        label: string
        href: string
      }>
    }>
    copyright: string
  }
}>()
</script>

<template>
  <footer class="bg-surface-container-lowest border-t border-outline-variant/30 py-16">
    <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
        <!-- Brand Info -->
        <div class="md:col-span-5">
          <div class="flex items-center gap-2 mb-6">
            <div
              class="w-10 h-10 rounded-lg bg-primary text-on-primary font-bold flex items-center justify-center text-xl"
            >
              H
            </div>
            <span class="font-display-xl text-2xl font-bold tracking-tight text-primary">{{
              content.brandName
            }}</span>
          </div>
          <p class="font-body-md text-on-surface-variant max-w-sm">
            {{ content.description }}
          </p>
        </div>

        <!-- Links Columns -->
        <div class="md:col-span-7 grid grid-cols-2 gap-8">
          <div v-for="(col, idx) in content.columns" :key="idx">
            <h4 class="font-headline-md text-lg text-primary mb-6">{{ col.title }}</h4>
            <ul class="space-y-4">
              <li v-for="(link, lIdx) in col.links" :key="lIdx">
                <a
                  :href="link.href"
                  class="font-body-md text-on-surface-variant hover:text-secondary transition-colors"
                >
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Copyright & Bottom Line -->
      <div
        class="border-t border-outline-variant/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
      >
        <p class="font-body-md text-on-surface-variant text-sm text-center md:text-left">
          {{ content.copyright }}
        </p>
      </div>
    </div>
  </footer>
</template>
