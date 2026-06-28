<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Layers3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-vue-next'
import type { LandingSection } from '@/features/landing/shared/types/landing.types'

type RawRecord = Record<string, unknown>
type DesignFamily = 'software' | 'care' | 'experience' | 'operations' | 'advisory' | 'community'

const props = defineProps<{
  content: RawRecord
  styleConfig?: RawRecord
  section: LandingSection
}>()

const colors = computed(() => {
  const raw = objectValue(props.styleConfig?.colors)
  return {
    primary: stringValue(raw.primary, '#2563EB'),
    secondary: stringValue(raw.secondary, '#0F172A'),
    surface: stringValue(raw.surface, '#EFF6FF'),
    text: stringValue(raw.text, '#0F172A'),
    muted: stringValue(raw.muted, '#64748B'),
  }
})

const metadata = computed(() => objectValue(props.content.metadata))
const visual = computed(() => objectValue(props.content.visual))
const templateSlug = computed(() => stringValue(metadata.value.templateSlug, 'enterprise-template'))
const templateIndustry = computed(() => stringValue(metadata.value.industry, 'Enterprise'))
const title = computed(() => stringValue(props.content.title, 'Template section'))
const description = computed(() => stringValue(props.content.description, ''))
const items = computed(() => arrayValue(props.content.items))
const logos = computed(() => arrayValue(props.content.logos).map((item) => String(item)))
const steps = computed(() => arrayValue(props.content.steps))
const plans = computed(() => arrayValue(props.content.plans))
const trustBadges = computed(() => stringArrayValue(props.content.trustBadges))
const styleVariant = computed(() => stringValue(props.styleConfig?.variant, 'enterprise'))
const styleFamily = computed(() => stringValue(props.styleConfig?.family, ''))
const heroStyle = computed(() => objectValue(props.styleConfig?.hero))
const heroBackgroundImage = computed(() => stringValue(heroStyle.value.backgroundImage, ''))
const heroBackgroundStyle = computed(() =>
  heroBackgroundImage.value
    ? {
        backgroundImage: `url("${heroBackgroundImage.value}")`,
      }
    : {},
)
const layoutSeed = computed(() => hashText(`${templateSlug.value}-${styleVariant.value}`) % 3)
const designFamily = computed<DesignFamily>(() =>
  resolveDesignFamily(
    templateSlug.value,
    templateIndustry.value,
    styleVariant.value,
    styleFamily.value,
  ),
)

const shellClass = computed(() => {
  switch (designFamily.value) {
    case 'care':
      return 'bg-cyan-50 text-slate-950'
    case 'experience':
      return 'bg-stone-950 text-white'
    case 'operations':
      return 'bg-black text-white'
    case 'advisory':
      return 'bg-slate-50 text-slate-950'
    case 'community':
      return 'bg-indigo-50 text-slate-950'
    default:
      return 'bg-white text-slate-950'
  }
})

const sectionToneClass = computed(() => {
  switch (designFamily.value) {
    case 'experience':
    case 'operations':
      return 'bg-black text-white'
    case 'care':
      return 'bg-cyan-50 text-slate-950'
    case 'community':
      return 'bg-indigo-50 text-slate-950'
    case 'advisory':
      return 'bg-white text-slate-950'
    default:
      return 'bg-white text-slate-950'
  }
})

const cssVars = computed(() => ({
  '--template-primary': colors.value.primary,
  '--template-secondary': colors.value.secondary,
  '--template-surface': colors.value.surface,
  '--template-text': colors.value.text,
  '--template-muted': colors.value.muted,
}))

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function arrayValue(value: unknown): RawRecord[] {
  return Array.isArray(value) ? (value as RawRecord[]) : []
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function objectValue(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : {}
}

function itemIcon(name: unknown) {
  const icon = String(name || '').toLowerCase()
  if (icon.includes('shield')) return ShieldCheck
  if (icon.includes('chart')) return BarChart3
  if (icon.includes('spark')) return Sparkles
  if (icon.includes('clock')) return Clock3
  if (icon.includes('user')) return Users
  return Layers3
}

function hashText(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0)
}

function hasAny(value: string, keywords: string[]) {
  const normalized = value.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

function resolveDesignFamily(
  slug: string,
  industry: string,
  variant: string,
  explicitFamily: string,
): DesignFamily {
  if (
    ['software', 'care', 'experience', 'operations', 'advisory', 'community'].includes(
      explicitFamily,
    )
  ) {
    return explicitFamily as DesignFamily
  }

  const key = `${slug} ${industry} ${variant}`.toLowerCase()
  if (
    hasAny(key, [
      'health',
      'clinic',
      'telemedicine',
      'patient',
      'restaurant',
      'hospitality',
      'resort',
    ])
  ) {
    return hasAny(key, ['restaurant', 'hospitality', 'resort']) ? 'experience' : 'care'
  }
  if (hasAny(key, ['real-estate', 'property', 'ecommerce', 'creative', 'event'])) {
    return 'experience'
  }
  if (
    hasAny(key, [
      'logistics',
      'fleet',
      'manufacturing',
      'construction',
      'isp',
      'mikrotik',
      'network',
      'pos',
      'retail',
    ])
  ) {
    return 'operations'
  }
  if (
    hasAny(key, ['legal', 'accounting', 'company-profile', 'corporate', 'advisory', 'training'])
  ) {
    return 'advisory'
  }
  if (hasAny(key, ['nonprofit', 'membership', 'community', 'startup', 'education', 'academy'])) {
    return 'community'
  }
  return 'software'
}
</script>

<template>
  <section
    class="enterprise-template-section relative overflow-hidden"
    :class="shellClass"
    :style="cssVars"
  >
    <template v-if="section.type === 'hero'">
      <div v-if="designFamily === 'software'" class="relative overflow-hidden bg-white">
        <div
          v-if="heroBackgroundImage"
          class="absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-center opacity-20 lg:block"
          :style="heroBackgroundStyle"
        ></div>
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--template-surface),transparent_42%)]"
        ></div>
        <div
          class="relative mx-auto grid min-h-[820px] max-w-7xl items-center gap-12 px-6 py-28 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
        >
          <div>
            <span
              class="inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-xs font-bold shadow-sm"
              :style="{ borderColor: colors.primary + '33', color: colors.primary }"
            >
              <span class="size-2 rounded-full" :style="{ backgroundColor: colors.primary }"></span>
              {{ content.eyebrow || `${templateIndustry} Template` }}
            </span>

            <h1
              class="mt-8 max-w-4xl text-5xl font-black tracking-tight text-slate-950 md:text-7xl"
            >
              {{ content.title }}
            </h1>
            <p class="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              {{ content.description }}
            </p>

            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="#pricing"
                class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5"
                :style="{ backgroundColor: colors.primary }"
              >
                {{ content.primaryCta || 'Use template' }}
                <ArrowRight class="size-4" />
              </a>
              <a
                href="#features"
                class="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                {{ content.secondaryCta || 'View sections' }}
              </a>
            </div>
          </div>

          <div class="relative min-h-[540px]">
            <div
              class="absolute right-0 top-0 h-72 w-72 rounded-full blur-3xl"
              :style="{ backgroundColor: colors.primary + '22' }"
            ></div>
            <div class="relative ml-auto max-w-xl rounded-[2rem] border bg-white/90 p-4 shadow-2xl">
              <div class="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wide text-white/50">
                      Command view
                    </p>
                    <h3 class="mt-1 text-lg font-black">{{ templateIndustry }} workspace</h3>
                  </div>
                  <div
                    class="rounded-xl px-3 py-2 text-sm font-black"
                    :style="{ backgroundColor: colors.primary }"
                  >
                    98%
                  </div>
                </div>
                <div class="mt-8 grid gap-3 sm:grid-cols-3">
                  <div
                    v-for="index in 3"
                    :key="index"
                    class="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div
                      class="h-2 w-10 rounded-full"
                      :style="{ backgroundColor: colors.primary }"
                    ></div>
                    <div class="mt-6 h-16 rounded-xl bg-white/10"></div>
                  </div>
                </div>
                <div class="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="flex items-end gap-2">
                    <span
                      v-for="height in [42, 68, 52, 92, 74, 108, 86]"
                      :key="height"
                      class="flex-1 rounded-t-lg"
                      :style="{ height: `${height}px`, backgroundColor: colors.primary }"
                    ></span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="absolute -left-2 top-20 rounded-2xl border bg-white px-4 py-3 text-sm font-black shadow-xl"
            >
              {{ visual.type || 'dashboard_mockup' }}
            </div>
            <div
              class="absolute bottom-14 right-0 rounded-2xl border bg-white px-4 py-3 text-sm font-black shadow-xl"
            >
              {{ visual.motion || 'floating cards' }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="designFamily === 'care'"
        class="relative min-h-[820px] overflow-hidden bg-cyan-50"
      >
        <div
          v-if="heroBackgroundImage"
          class="absolute inset-y-0 right-0 hidden w-[48%] bg-cover bg-center opacity-25 lg:block"
          :style="heroBackgroundStyle"
        ></div>
        <div class="absolute left-0 top-0 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        <div
          class="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
          :style="{ backgroundColor: colors.primary }"
        ></div>
        <div
          class="relative mx-auto grid max-w-7xl gap-12 px-6 py-28 lg:grid-cols-[1fr_0.9fr] lg:px-8"
        >
          <div class="self-center">
            <span
              class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black shadow-sm"
              :style="{ color: colors.primary }"
            >
              <CalendarDays class="size-4" />
              {{ templateIndustry }} booking experience
            </span>
            <h1
              class="mt-8 max-w-4xl text-5xl font-black tracking-tight text-slate-950 md:text-7xl"
            >
              {{ content.title }}
            </h1>
            <p class="mt-7 max-w-2xl text-lg leading-8 text-slate-600">{{ content.description }}</p>
            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                class="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-black text-white shadow-xl"
                href="#pricing"
                :style="{ backgroundColor: colors.primary }"
              >
                {{ content.primaryCta || 'Book now' }}
                <ArrowRight class="size-4" />
              </a>
              <a
                class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-4 text-sm font-black text-slate-950"
                href="#features"
              >
                {{ content.secondaryCta || 'View services' }}
              </a>
            </div>
          </div>
          <div class="relative mx-auto min-h-[560px] w-full max-w-md">
            <div class="absolute inset-x-8 top-0 rounded-[2.5rem] bg-slate-950 p-4 shadow-2xl">
              <div class="rounded-[2rem] bg-white p-5">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-black uppercase text-slate-400">Today schedule</p>
                    <h3 class="mt-1 text-xl font-black text-slate-950">{{ templateIndustry }}</h3>
                  </div>
                  <span
                    class="rounded-full px-3 py-1 text-xs font-black text-white"
                    :style="{ backgroundColor: colors.primary }"
                    >Open</span
                  >
                </div>
                <div class="mt-8 space-y-3">
                  <div
                    v-for="step in steps.slice(0, 3)"
                    :key="String(step.title)"
                    class="rounded-2xl bg-cyan-50 p-4"
                  >
                    <p class="text-sm font-black text-slate-950">{{ step.title }}</p>
                    <p class="mt-1 text-xs leading-5 text-slate-500">{{ step.description }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute bottom-8 left-0 rounded-3xl bg-white p-5 shadow-2xl">
              <p class="text-xs font-black uppercase text-slate-400">Care trust</p>
              <p class="mt-2 text-3xl font-black" :style="{ color: colors.primary }">4.9</p>
            </div>
            <div class="absolute bottom-24 right-0 rounded-3xl bg-white p-5 shadow-2xl">
              <MapPin class="size-6" :style="{ color: colors.primary }" />
              <p class="mt-3 text-sm font-black text-slate-950">Nearest branch ready</p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="designFamily === 'experience'"
        class="relative min-h-[860px] overflow-hidden bg-stone-950 text-white"
      >
        <div
          v-if="heroBackgroundImage"
          class="absolute inset-0 bg-cover bg-center opacity-55"
          :style="heroBackgroundStyle"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20"></div>
        <div
          class="absolute inset-0 opacity-40"
          :style="{ background: `linear-gradient(135deg, ${colors.primary}55, transparent 55%)` }"
        ></div>
        <div
          class="relative mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-8"
        >
          <div class="self-end pb-10">
            <span
              class="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/80"
            >
              {{ templateIndustry }} launch page
            </span>
            <h1 class="mt-8 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              {{ content.title }}
            </h1>
            <p class="mt-7 max-w-2xl text-lg leading-8 text-white/70">{{ content.description }}</p>
            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                class="inline-flex items-center justify-center gap-2 rounded-none px-7 py-4 text-sm font-black text-white"
                href="#pricing"
                :style="{ backgroundColor: colors.primary }"
              >
                {{ content.primaryCta || 'Start' }}
                <ArrowRight class="size-4" />
              </a>
              <a
                class="inline-flex items-center justify-center border border-white/30 px-7 py-4 text-sm font-black text-white"
                href="#features"
              >
                {{ content.secondaryCta || 'Explore' }}
              </a>
            </div>
          </div>
          <div class="grid min-h-[640px] grid-cols-6 gap-4">
            <div class="col-span-4 row-span-2 rounded-[2rem] bg-white/10 p-6 backdrop-blur">
              <div
                class="h-full rounded-[1.5rem]"
                :style="{
                  background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`,
                }"
              ></div>
            </div>
            <div class="col-span-2 rounded-[2rem] border border-white/10 bg-white/10 p-5">
              <Sparkles class="size-8" :style="{ color: colors.primary }" />
              <p class="mt-8 text-sm font-black">{{ visual.type || 'premium visual story' }}</p>
            </div>
            <div class="col-span-2 rounded-[2rem] bg-white p-5 text-slate-950">
              <p class="text-xs font-black uppercase text-slate-400">Conversion</p>
              <p class="mt-3 text-4xl font-black">High</p>
            </div>
            <div class="col-span-3 rounded-[2rem] border border-white/10 bg-white/10 p-5">
              <p class="text-sm font-black">Featured experience</p>
              <p class="mt-3 text-sm leading-6 text-white/60">
                {{ visual.prompt || content.description }}
              </p>
            </div>
            <div class="col-span-3 rounded-[2rem] bg-white/10 p-5">
              <p class="text-sm font-black">Immersive catalog</p>
              <div class="mt-6 flex gap-2">
                <span
                  v-for="index in 4"
                  :key="index"
                  class="h-16 flex-1 rounded-xl bg-white/20"
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="designFamily === 'operations'"
        class="relative overflow-hidden bg-black text-white"
      >
        <div
          v-if="heroBackgroundImage"
          class="absolute inset-0 bg-cover bg-center opacity-25"
          :style="heroBackgroundStyle"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/50"></div>
        <div
          class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]"
        ></div>
        <div
          class="relative mx-auto grid min-h-[820px] max-w-7xl gap-12 px-6 py-28 lg:grid-cols-[0.95fr_1.05fr] lg:px-8"
        >
          <div class="self-center">
            <span
              class="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white/70"
            >
              <Zap class="size-4" :style="{ color: colors.primary }" />
              {{ templateIndustry }} control room
            </span>
            <h1 class="mt-8 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              {{ content.title }}
            </h1>
            <p class="mt-7 max-w-2xl text-lg leading-8 text-white/65">{{ content.description }}</p>
            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                class="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-black text-black"
                href="#pricing"
                :style="{ backgroundColor: colors.primary }"
              >
                {{ content.primaryCta || 'Optimize' }}
                <ArrowRight class="size-4" />
              </a>
              <a
                class="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-4 text-sm font-black text-white"
                href="#features"
              >
                {{ content.secondaryCta || 'View stack' }}
              </a>
            </div>
          </div>
          <div
            class="self-center rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-2xl"
          >
            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:col-span-2">
                <p class="text-xs font-black uppercase text-white/40">Live operation map</p>
                <div class="mt-8 grid grid-cols-6 gap-2">
                  <span
                    v-for="index in 30"
                    :key="index"
                    class="h-10 rounded-lg"
                    :class="index % 5 === 0 ? 'bg-white/20' : 'bg-white/5'"
                  ></span>
                </div>
              </div>
              <div
                v-for="item in items.slice(0, 2)"
                :key="String(item.title)"
                class="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <component
                  :is="itemIcon(item.icon)"
                  class="size-7"
                  :style="{ color: colors.primary }"
                />
                <p class="mt-6 text-sm font-black">{{ item.title }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="designFamily === 'advisory'" class="relative bg-slate-50">
        <div
          v-if="heroBackgroundImage"
          class="absolute inset-y-0 left-0 hidden w-[38%] bg-cover bg-center opacity-15 lg:block"
          :style="heroBackgroundStyle"
        ></div>
        <div
          class="mx-auto grid min-h-[800px] max-w-7xl gap-12 px-6 py-28 lg:grid-cols-[0.75fr_1.25fr] lg:px-8"
        >
          <div class="self-center rounded-[2rem] border bg-white p-8 shadow-sm">
            <div
              v-if="heroBackgroundImage"
              class="mb-8 h-48 rounded-[1.5rem] bg-cover bg-center"
              :style="heroBackgroundStyle"
            ></div>
            <p class="text-xs font-black uppercase tracking-wide text-slate-400">
              Trusted advisory profile
            </p>
            <div class="mt-10 space-y-4">
              <div
                v-for="badge in trustBadges"
                :key="badge"
                class="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <CircleCheck class="size-5" :style="{ color: colors.primary }" />
                <span class="text-sm font-black text-slate-700">{{ badge }}</span>
              </div>
            </div>
          </div>
          <div class="self-center">
            <span
              class="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-black shadow-sm"
              :style="{ color: colors.primary }"
            >
              {{ templateIndustry }} authority page
            </span>
            <h1
              class="mt-8 max-w-5xl text-5xl font-black tracking-tight text-slate-950 md:text-7xl"
            >
              {{ content.title }}
            </h1>
            <p class="mt-7 max-w-2xl text-lg leading-8 text-slate-600">{{ content.description }}</p>
            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-black text-white"
                href="#pricing"
                :style="{ backgroundColor: colors.primary }"
              >
                {{ content.primaryCta || 'Consult' }}
                <ArrowRight class="size-4" />
              </a>
              <a
                class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-950"
                href="#features"
              >
                {{ content.secondaryCta || 'Explore practice' }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="relative overflow-hidden bg-indigo-50">
        <div
          v-if="heroBackgroundImage"
          class="absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-center opacity-20 lg:block"
          :style="heroBackgroundStyle"
        ></div>
        <div class="absolute inset-x-0 top-0 h-40 bg-white"></div>
        <div
          class="relative mx-auto grid min-h-[820px] max-w-7xl gap-10 px-6 py-24 lg:grid-cols-[1fr_0.9fr] lg:px-8"
        >
          <div class="self-center">
            <span
              class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black shadow-sm"
              :style="{ color: colors.primary }"
            >
              <Users class="size-4" />
              {{ templateIndustry }} growth page
            </span>
            <h1
              class="mt-8 max-w-4xl text-5xl font-black tracking-tight text-slate-950 md:text-7xl"
            >
              {{ content.title }}
            </h1>
            <p class="mt-7 max-w-2xl text-lg leading-8 text-slate-600">{{ content.description }}</p>
            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                class="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-white"
                href="#pricing"
                :style="{ backgroundColor: colors.primary }"
              >
                {{ content.primaryCta || 'Join' }}
                <ArrowRight class="size-4" />
              </a>
              <a
                class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-950"
                href="#features"
              >
                {{ content.secondaryCta || 'See details' }}
              </a>
            </div>
          </div>
          <div class="self-center">
            <div class="rotate-2 rounded-[2rem] bg-white p-6 shadow-2xl">
              <div
                class="-rotate-3 rounded-[1.5rem] p-6 text-white"
                :style="{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                }"
              >
                <p class="text-xs font-black uppercase text-white/60">Momentum card</p>
                <h3 class="mt-6 text-4xl font-black">{{ templateIndustry }}</h3>
                <div class="mt-10 grid gap-3">
                  <div
                    v-for="step in steps.slice(0, 3)"
                    :key="String(step.title)"
                    class="rounded-2xl bg-white/15 p-4"
                  >
                    <p class="text-sm font-black">{{ step.title }}</p>
                    <p class="mt-1 text-xs leading-5 text-white/70">{{ step.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="section.type === 'partner_logos'">
      <div :class="sectionToneClass">
        <div class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <p class="text-center text-sm font-black uppercase tracking-wide opacity-60">
            {{ content.title || 'Trusted by teams that move carefully and fast' }}
          </p>
          <div
            class="mt-8 grid gap-3"
            :class="
              layoutSeed === 0
                ? 'grid-cols-2 md:grid-cols-4'
                : layoutSeed === 1
                  ? 'grid-cols-1 md:grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4'
            "
          >
            <div
              v-for="logo in logos"
              :key="logo"
              class="border px-5 py-5 text-center text-sm font-black"
              :class="
                designFamily === 'experience' || designFamily === 'operations'
                  ? 'rounded-none border-white/10 bg-white/5 text-white'
                  : 'rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm'
              "
            >
              {{ logo }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="section.type === 'features'">
      <div id="features" :class="sectionToneClass">
        <div class="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div :class="layoutSeed === 1 ? 'max-w-3xl' : 'mx-auto max-w-3xl text-center'">
            <h2 class="text-4xl font-black tracking-tight md:text-5xl">{{ title }}</h2>
            <p class="mt-4 text-lg leading-8 opacity-70">{{ description }}</p>
          </div>
          <div
            class="mt-14 grid gap-5"
            :class="
              layoutSeed === 0
                ? 'md:grid-cols-3'
                : layoutSeed === 1
                  ? 'md:grid-cols-[1.2fr_0.8fr_0.8fr]'
                  : 'md:grid-cols-2'
            "
          >
            <article
              v-for="(item, index) in items"
              :key="String(item.title)"
              class="group border p-8 transition hover:-translate-y-1"
              :class="[
                layoutSeed === 2 && index === 0 ? 'md:row-span-2' : '',
                designFamily === 'experience' || designFamily === 'operations'
                  ? 'rounded-none border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                  : 'rounded-3xl border-slate-200 bg-white text-slate-950 shadow-sm hover:shadow-2xl',
              ]"
            >
              <div
                class="flex size-14 items-center justify-center rounded-2xl"
                :style="{ backgroundColor: colors.primary + '16', color: colors.primary }"
              >
                <component :is="itemIcon(item.icon)" class="size-7" />
              </div>
              <h3 class="mt-8 text-xl font-black">{{ item.title }}</h3>
              <p class="mt-3 text-sm leading-6 opacity-70">{{ item.description }}</p>
            </article>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="section.type === 'statistics'">
      <div
        :class="
          designFamily === 'care' || designFamily === 'community'
            ? 'bg-white text-slate-950'
            : 'bg-slate-950 text-white'
        "
      >
        <div
          class="mx-auto grid max-w-7xl gap-5 px-6 py-24 lg:px-8"
          :class="layoutSeed === 2 ? 'md:grid-cols-[1.4fr_0.8fr_0.8fr]' : 'md:grid-cols-3'"
        >
          <article
            v-for="(item, index) in items"
            :key="String(item.label)"
            class="border p-8"
            :class="[
              layoutSeed === 2 && index === 0 ? 'md:row-span-2' : '',
              designFamily === 'care' || designFamily === 'community'
                ? 'rounded-3xl border-slate-200 bg-slate-50 text-slate-950'
                : 'rounded-3xl border-white/10 bg-white/[0.04] text-white',
            ]"
          >
            <strong class="text-5xl font-black" :style="{ color: colors.primary }">{{
              item.value
            }}</strong>
            <p class="mt-5 text-sm font-black uppercase tracking-wide">{{ item.label }}</p>
            <p class="mt-3 text-sm leading-6 opacity-60">{{ item.description }}</p>
          </article>
        </div>
      </div>
    </template>

    <template v-else-if="section.type === 'services'">
      <div :class="sectionToneClass">
        <div class="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div
            class="grid gap-10 lg:items-start"
            :class="layoutSeed === 1 ? 'lg:grid-cols-[1.2fr_0.8fr]' : 'lg:grid-cols-[0.8fr_1.2fr]'"
          >
            <div :class="layoutSeed === 1 ? 'lg:order-2' : ''">
              <p
                class="text-sm font-black uppercase tracking-wide"
                :style="{ color: colors.primary }"
              >
                Conversion path
              </p>
              <h2 class="mt-3 text-4xl font-black tracking-tight">{{ title }}</h2>
            </div>
            <div class="grid gap-4">
              <article
                v-for="step in steps"
                :key="String(step.title)"
                class="grid gap-4 border p-5 md:items-center"
                :class="[
                  layoutSeed === 0 ? 'md:grid-cols-[72px_1fr_auto]' : 'md:grid-cols-[1fr_auto]',
                  designFamily === 'experience' || designFamily === 'operations'
                    ? 'rounded-none border-white/10 bg-white/[0.04]'
                    : 'rounded-3xl border-slate-200 bg-white',
                ]"
              >
                <div
                  v-if="layoutSeed === 0"
                  class="flex size-14 items-center justify-center rounded-2xl text-xl font-black text-white"
                  :style="{ backgroundColor: colors.primary }"
                >
                  {{ step.number }}
                </div>
                <div>
                  <p
                    v-if="layoutSeed !== 0"
                    class="text-xs font-black uppercase"
                    :style="{ color: colors.primary }"
                  >
                    Step {{ step.number }}
                  </p>
                  <h3 class="font-black">{{ step.title }}</h3>
                  <p class="mt-1 text-sm leading-6 opacity-60">{{ step.description }}</p>
                </div>
                <ChevronRight class="hidden size-5 opacity-40 md:block" />
              </article>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="section.type === 'pricing'">
      <div id="pricing" :class="sectionToneClass">
        <div class="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div class="mx-auto max-w-3xl text-center">
            <h2 class="text-4xl font-black tracking-tight md:text-5xl">{{ title }}</h2>
          </div>
          <div
            class="mt-14 grid gap-5"
            :class="layoutSeed === 1 ? 'md:grid-cols-[0.8fr_1.2fr_0.8fr]' : 'md:grid-cols-3'"
          >
            <article
              v-for="(plan, index) in plans"
              :key="String(plan.name)"
              class="border p-8 shadow-sm"
              :class="[
                index === 1 ? 'scale-[1.02]' : '',
                designFamily === 'experience' || designFamily === 'operations'
                  ? index === 1
                    ? 'rounded-none border-white/20 bg-white text-slate-950'
                    : 'rounded-none border-white/10 bg-white/[0.04] text-white'
                  : index === 1
                    ? 'rounded-3xl bg-slate-950 text-white'
                    : 'rounded-3xl bg-white text-slate-950',
              ]"
            >
              <h3 class="text-xl font-black">{{ plan.name }}</h3>
              <p
                class="mt-4 text-3xl font-black"
                :style="{ color: index === 1 ? colors.primary : colors.secondary }"
              >
                {{ plan.priceLabel }}
              </p>
              <ul class="mt-8 space-y-3 text-sm">
                <li
                  v-for="feature in stringArrayValue(plan.features)"
                  :key="feature"
                  class="flex gap-2"
                >
                  <Check class="size-4 shrink-0" :style="{ color: colors.primary }" />
                  <span>{{ feature }}</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="section.type === 'faq'">
      <div :class="sectionToneClass">
        <div class="mx-auto max-w-4xl px-6 py-24 lg:px-8">
          <h2 class="text-center text-4xl font-black tracking-tight">{{ title }}</h2>
          <div
            class="mt-10 divide-y border"
            :class="
              designFamily === 'experience' || designFamily === 'operations'
                ? 'divide-white/10 border-white/10 bg-white/[0.04]'
                : 'divide-slate-200 rounded-3xl border-slate-200 bg-white'
            "
          >
            <details v-for="item in items" :key="String(item.question)" class="group p-6">
              <summary class="cursor-pointer list-none font-black">{{ item.question }}</summary>
              <p class="mt-3 text-sm leading-6 opacity-65">{{ item.answer }}</p>
            </details>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        :class="
          designFamily === 'care' || designFamily === 'community'
            ? 'bg-white text-slate-950'
            : 'bg-slate-950 text-white'
        "
      >
        <div class="mx-auto max-w-4xl px-6 py-24 text-center lg:px-8">
          <h2 class="text-4xl font-black tracking-tight md:text-5xl">{{ title }}</h2>
          <p class="mt-5 text-lg leading-8 opacity-70">{{ description }}</p>
          <div class="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              class="inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-black text-white"
              :class="designFamily === 'experience' ? 'rounded-none' : 'rounded-xl'"
              href="#"
              :style="{ backgroundColor: colors.primary }"
            >
              {{ content.primaryButtonText || 'Use template' }}
              <ArrowRight class="size-4" />
            </a>
            <a
              class="inline-flex items-center justify-center border px-6 py-4 text-sm font-black"
              :class="
                designFamily === 'experience'
                  ? 'rounded-none border-white/20 text-white'
                  : 'rounded-xl border-slate-300'
              "
              href="#features"
            >
              {{ content.secondaryButtonText || 'View details' }}
            </a>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
