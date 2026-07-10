<script setup lang="ts">
defineProps<{
  content: {
    title: string
    items: Array<{
      question: string
      answer: string
    }>
  }
}>()
</script>

<template>
  <section id="faq" class="py-section-gap bg-surface">
    <div class="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="text-center mb-16 fade-up">
        <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
          {{ content.title }}
        </h2>
      </div>

      <div class="space-y-4 fade-up">
        <div
          v-for="(item, idx) in content.items"
          :key="idx"
          class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden"
        >
          <details class="group">
            <summary
              class="flex justify-between items-center font-headline-md text-lg p-6 cursor-pointer text-on-surface list-none select-none"
            >
              <span>{{ item.question }}</span>
              <span class="transition-transform duration-200 group-open:rotate-180">
                <span class="material-symbols-outlined">expand_more</span>
              </span>
            </summary>
            <div
              class="px-6 pb-6 text-on-surface-variant font-body-md border-t border-outline-variant/10 pt-4"
            >
              <p>{{ item.answer }}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  </section>
</template>
