<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft, CheckCircle2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import type { LandingMenuPageDefinition } from '@/features/landing-management/landing-menu'
import { getLandingMenuToneClasses } from '@/features/landing-management/landing-menu'

const props = defineProps<{
  definition: LandingMenuPageDefinition
  parentRouteName: string
  parentLabel: string
}>()
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="props.definition.label" :description="props.definition.description">
      <RouterLink
        :to="{ name: props.parentRouteName }"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <ArrowLeft class="size-4" />
        Back to {{ props.parentLabel }}
      </RouterLink>
    </PageHeader>

    <BaseCard class="overflow-hidden !p-0">
      <div class="grid gap-0 lg:grid-cols-[1.4fr_0.9fr]">
        <div class="space-y-4 p-6">
          <div
            class="inline-flex items-center gap-3 rounded-2xl border border-white/70 px-4 py-3 shadow-sm dark:border-gray-800"
            :class="getLandingMenuToneClasses(props.definition.tone)"
          >
            <span
              class="grid size-11 place-items-center rounded-2xl bg-white/15 text-white shadow-sm"
            >
              <component :is="props.definition.icon" class="size-5" />
            </span>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                {{ props.parentLabel }}
              </p>
              <h2 class="text-lg font-semibold text-white">{{ props.definition.label }}</h2>
            </div>
          </div>

          <p class="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            {{ props.definition.description }}
          </p>

          <div class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="stat in props.definition.stats"
              :key="stat.label"
              class="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60"
            >
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                {{ stat.label }}
              </p>
              <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {{ stat.value }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="border-t border-gray-200 bg-gray-50/80 p-6 dark:border-gray-800 dark:bg-gray-900/60 lg:border-l lg:border-t-0"
        >
          <p class="text-sm font-semibold text-gray-900 dark:text-white">What this page covers</p>
          <div class="mt-4 space-y-3">
            <div
              v-for="section in props.definition.sections"
              :key="section.title"
              class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            >
              <div class="flex items-center gap-2">
                <CheckCircle2 class="size-4 shrink-0 text-emerald-500" />
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ section.title }}
                </p>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="item in section.items"
                  :key="item"
                  class="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  {{ item }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
