<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ArrowLeft,
  Brush,
  CheckCircle2,
  ExternalLink,
  Globe2,
  ImageIcon,
  Loader2,
  Mail,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import TextField from '@/components/form/TextField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type { LandingBranding } from '@/features/landing/shared/types/landing.types'

type SocialPlatform = 'instagram' | 'linkedin' | 'x' | 'youtube'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
    parentRouteName?: string
  }>(),
  {
    title: 'Landing Brand & Theme',
    description: 'Kelola identitas visual landing page.',
    mode: 'workspace',
    parentRouteName: 'landing-pages',
  },
)

const defaultColors = {
  primary: '#2563eb',
  secondary: '#0f172a',
  accent: '#06b6d4',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
}

const defaultTypography = {
  heading_font: 'Inter',
  body_font: 'Inter',
}

const defaultShape = {
  button_radius: '10px',
  card_radius: '16px',
}

const defaultLayout = {
  width: '1200px',
  spacing: 'comfortable',
  background_style: 'soft-gradient',
  color_mode: 'light',
  header_style: 'floating',
  footer_style: 'enterprise',
}

const socialPlatforms: Array<{ key: SocialPlatform; label: string; placeholder: string }> = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/brand' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/brand' },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/brand' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@brand' },
]

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')
const branding = ref<LandingBranding | null>(null)

const form = reactive({
  company_name: '',
  tagline: '',
  logo_light_url: '',
  logo_dark_url: '',
  favicon_url: '',
  social_image_url: '',
  colors: { ...defaultColors },
  typography: { ...defaultTypography },
  shape: { ...defaultShape },
  layout: { ...defaultLayout },
  contact: {
    email: '',
    phone: '',
    address: '',
  },
  social: {
    instagram: '',
    linkedin: '',
    x: '',
    youtube: '',
  } as Record<SocialPlatform, string>,
})

const paletteItems = computed(() => [
  { key: 'primary', label: 'Primary', value: form.colors.primary },
  { key: 'secondary', label: 'Secondary', value: form.colors.secondary },
  { key: 'accent', label: 'Accent', value: form.colors.accent },
  { key: 'background', label: 'Background', value: form.colors.background },
  { key: 'surface', label: 'Surface', value: form.colors.surface },
  { key: 'text', label: 'Text', value: form.colors.text },
  { key: 'muted', label: 'Muted', value: form.colors.muted },
])

const previewShellStyle = computed(() => ({
  background:
    form.layout.background_style === 'solid'
      ? form.colors.background
      : `radial-gradient(circle at top left, ${hexWithAlpha(form.colors.primary, 0.16)}, transparent 34%), linear-gradient(135deg, ${form.colors.background}, ${hexWithAlpha(form.colors.accent, 0.12)})`,
  color: form.colors.text,
  fontFamily: `"${form.typography.body_font}", Inter, sans-serif`,
}))

const previewCardStyle = computed(() => ({
  background: form.colors.surface,
  borderColor: hexWithAlpha(form.colors.primary, 0.18),
  borderRadius: form.shape.card_radius,
}))

const previewButtonStyle = computed(() => ({
  background: form.colors.primary,
  borderRadius: form.shape.button_radius,
}))

const previewLogoUrl = computed(() => form.logo_light_url || form.logo_dark_url)
const completedFields = computed(() => {
  const checks = [
    form.company_name,
    form.tagline,
    form.logo_light_url || form.logo_dark_url,
    form.colors.primary,
    form.colors.secondary,
    form.typography.heading_font,
    form.contact.email || form.contact.phone,
    socialLinksForPayload().length > 0,
  ]
  return checks.filter(Boolean).length
})

onMounted(() => {
  void loadBranding()
})

async function loadBranding() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.getDefaultBranding()
    branding.value = response.data
    fillForm(response.data)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat brand & theme landing.')
  } finally {
    loading.value = false
  }
}

async function saveBranding() {
  saving.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.updateDefaultBranding({
      company_name: nullable(form.company_name),
      tagline: nullable(form.tagline),
      logo_light_url: nullable(form.logo_light_url),
      logo_dark_url: nullable(form.logo_dark_url),
      favicon_url: nullable(form.favicon_url),
      social_image_url: nullable(form.social_image_url),
      colors: cleanRecord(form.colors),
      typography: cleanRecord(form.typography),
      shape: cleanRecord(form.shape),
      layout: cleanRecord(form.layout),
      contact: cleanRecord(form.contact),
      social_links: socialLinksForPayload(),
    })
    branding.value = response.data
    fillForm(response.data)
    showNotice('Brand & theme berhasil disimpan.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan brand & theme.')
  } finally {
    saving.value = false
  }
}

function fillForm(data: LandingBranding | null) {
  form.company_name = data?.company_name || ''
  form.tagline = data?.tagline || ''
  form.logo_light_url = data?.logo_light_url || ''
  form.logo_dark_url = data?.logo_dark_url || ''
  form.favicon_url = data?.favicon_url || ''
  form.social_image_url = data?.social_image_url || ''
  form.colors = { ...defaultColors, ...pickRecord(data?.colors) }
  form.typography = { ...defaultTypography, ...pickRecord(data?.typography) }
  form.shape = { ...defaultShape, ...pickRecord(data?.shape) }
  form.layout = { ...defaultLayout, ...pickRecord(data?.layout) }
  form.contact = {
    email: stringFromRecord(data?.contact, 'email'),
    phone: stringFromRecord(data?.contact, 'phone'),
    address: stringFromRecord(data?.contact, 'address'),
  }
  form.social = {
    instagram: '',
    linkedin: '',
    x: '',
    youtube: '',
  }

  for (const item of data?.social_links ?? []) {
    const platform = String(item.platform ?? '').toLowerCase() as SocialPlatform
    if (platform in form.social) form.social[platform] = String(item.url ?? '')
  }
}

function resetToDefault() {
  fillForm(null)
  showNotice('Form dikembalikan ke preset default. Klik Save untuk menyimpan.')
}

function socialLinksForPayload() {
  return socialPlatforms
    .map((platform) => ({
      platform: platform.key,
      url: form.social[platform.key].trim(),
    }))
    .filter((item) => item.url)
}

function pickRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {}
}

function stringFromRecord(value: unknown, key: string) {
  const record = pickRecord(value)
  return typeof record[key] === 'string' ? record[key] : ''
}

function cleanRecord(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  )
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

function hexWithAlpha(hex: string, alpha: number) {
  const safeHex = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(safeHex)) return `rgba(37, 99, 235, ${alpha})`
  const red = parseInt(safeHex.slice(0, 2), 16)
  const green = parseInt(safeHex.slice(2, 4), 16)
  const blue = parseInt(safeHex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function getApiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

function showNotice(message: string) {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 3000)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="props.title" :description="props.description">
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          :to="{ name: props.parentRouteName }"
          class="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200"
        >
          <ArrowLeft class="size-4" />
          Back
        </RouterLink>
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadBranding">
          <Loader2 v-if="loading" class="size-4 animate-spin" />
          <RefreshCw v-else class="size-4" />
          Refresh
        </BaseButton>
        <BaseButton type="button" :disabled="saving" @click="saveBranding">
          <Loader2 v-if="saving" class="size-4 animate-spin" />
          <Save v-else class="size-4" />
          Save theme
        </BaseButton>
      </div>
    </PageHeader>

    <div
      v-if="notice"
      class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
    >
      <CheckCircle2 class="size-4" />
      {{ notice }}
    </div>

    <div
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
    >
      {{ errorMessage }}
    </div>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div class="space-y-6">
        <div class="rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-950">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 text-sm font-semibold text-rose-600">
                <Sparkles class="size-4" />
                Brand identity
              </div>
              <h2 class="mt-2 text-xl font-bold text-gray-950 dark:text-white">
                Identitas utama yang akan diwarisi semua landing page.
              </h2>
            </div>
            <span
              class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300"
            >
              {{ completedFields }}/8 ready
            </span>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              v-model="form.company_name"
              name="company-name"
              label="Company name"
              placeholder="Zyad Cloud"
            />
            <TextField
              v-model="form.tagline"
              name="tagline"
              label="Tagline"
              placeholder="Enterprise growth platform"
            />
            <TextField
              v-model="form.logo_light_url"
              name="logo-light-url"
              label="Logo light URL"
              placeholder="https://..."
            />
            <TextField
              v-model="form.logo_dark_url"
              name="logo-dark-url"
              label="Logo dark URL"
              placeholder="https://..."
            />
            <TextField
              v-model="form.favicon_url"
              name="favicon-url"
              label="Favicon URL"
              placeholder="https://..."
            />
            <TextField
              v-model="form.social_image_url"
              name="social-image-url"
              label="Social image URL"
              placeholder="https://..."
            />
          </div>
        </div>

        <div class="rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-950">
          <div class="flex items-center gap-2 text-sm font-semibold text-rose-600">
            <Palette class="size-4" />
            Theme tokens
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label v-for="item in paletteItems" :key="item.key" class="block">
              <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ item.label }}
              </span>
              <div class="flex overflow-hidden rounded-lg border bg-white dark:bg-gray-950">
                <input
                  v-model="form.colors[item.key as keyof typeof form.colors]"
                  type="color"
                  class="h-11 w-14 cursor-pointer border-0 bg-transparent p-1"
                />
                <input
                  v-model="form.colors[item.key as keyof typeof form.colors]"
                  class="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                />
              </div>
            </label>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              v-model="form.typography.heading_font"
              name="heading-font"
              label="Heading font"
              placeholder="Inter"
            />
            <TextField
              v-model="form.typography.body_font"
              name="body-font"
              label="Body font"
              placeholder="Inter"
            />
            <TextField
              v-model="form.shape.button_radius"
              name="button-radius"
              label="Button radius"
              placeholder="10px"
            />
            <TextField
              v-model="form.shape.card_radius"
              name="card-radius"
              label="Card radius"
              placeholder="16px"
            />
          </div>
        </div>

        <div class="rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-950">
          <div class="flex items-center gap-2 text-sm font-semibold text-rose-600">
            <Brush class="size-4" />
            Layout behavior
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-3">
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Background style
              </span>
              <select
                v-model="form.layout.background_style"
                class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              >
                <option value="soft-gradient">Soft gradient</option>
                <option value="solid">Solid</option>
                <option value="editorial">Editorial</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Header style
              </span>
              <select
                v-model="form.layout.header_style"
                class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              >
                <option value="floating">Floating</option>
                <option value="solid">Solid</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Color mode
              </span>
              <select
                v-model="form.layout.color_mode"
                class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>
        </div>

        <div class="rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-950">
          <div class="flex items-center gap-2 text-sm font-semibold text-rose-600">
            <Mail class="size-4" />
            Contact & social
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-3">
            <TextField
              v-model="form.contact.email"
              name="contact-email"
              label="Email"
              placeholder="hello@example.com"
            />
            <TextField
              v-model="form.contact.phone"
              name="contact-phone"
              label="Phone"
              placeholder="+62..."
            />
            <TextField
              v-model="form.contact.address"
              name="contact-address"
              label="Address"
              placeholder="Jakarta, Indonesia"
            />
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              v-for="platform in socialPlatforms"
              :key="platform.key"
              v-model="form.social[platform.key]"
              :name="`social-${platform.key}`"
              :label="platform.label"
              :placeholder="platform.placeholder"
            />
          </div>
        </div>
      </div>

      <aside class="xl:sticky xl:top-24 xl:self-start">
        <div class="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-950">
          <div class="border-b px-5 py-4">
            <p class="text-sm font-semibold text-gray-950 dark:text-white">Live preview</p>
            <p class="text-xs text-gray-500">Preview token visual untuk landing publik.</p>
          </div>
          <div class="p-4">
            <div class="overflow-hidden rounded-2xl border p-4" :style="previewShellStyle">
              <div
                class="flex items-center justify-between border bg-white/70 px-4 py-3 shadow-sm backdrop-blur"
                :class="{
                  'rounded-full': form.layout.header_style === 'floating',
                  'rounded-xl': form.layout.header_style !== 'floating',
                }"
                :style="{ borderColor: hexWithAlpha(form.colors.primary, 0.18) }"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="previewLogoUrl"
                    :src="previewLogoUrl"
                    alt=""
                    class="size-8 rounded-lg object-contain"
                  />
                  <div
                    v-else
                    class="grid size-8 place-items-center rounded-lg text-white"
                    :style="{ background: form.colors.primary }"
                  >
                    <ImageIcon class="size-4" />
                  </div>
                  <span class="text-sm font-bold">{{ form.company_name || 'Brand Name' }}</span>
                </div>
                <span class="text-xs font-semibold" :style="{ color: form.colors.muted }"
                  >Menu</span
                >
              </div>

              <div class="py-10">
                <div
                  class="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
                  :style="{
                    background: hexWithAlpha(form.colors.accent, 0.16),
                    color: form.colors.secondary,
                  }"
                >
                  <Globe2 class="size-3.5" />
                  Enterprise landing system
                </div>
                <h3
                  class="max-w-sm text-4xl font-black leading-tight"
                  :style="{ fontFamily: `'${form.typography.heading_font}', Inter, sans-serif` }"
                >
                  {{ form.tagline || 'Build a credible public presence faster.' }}
                </h3>
                <p class="mt-4 max-w-sm text-sm leading-6" :style="{ color: form.colors.muted }">
                  Token warna, tipografi, radius, asset, dan kontak disimpan sebagai default brand
                  untuk renderer landing page.
                </p>
                <div class="mt-6 flex items-center gap-3">
                  <button
                    class="px-4 py-2 text-sm font-bold text-white"
                    :style="previewButtonStyle"
                  >
                    Primary CTA
                  </button>
                  <button
                    class="border px-4 py-2 text-sm font-bold"
                    :style="{
                      borderColor: hexWithAlpha(form.colors.secondary, 0.28),
                      borderRadius: form.shape.button_radius,
                    }"
                  >
                    Learn more
                  </button>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="border p-4 shadow-sm" :style="previewCardStyle">
                  <p class="text-xs font-bold uppercase" :style="{ color: form.colors.primary }">
                    Palette
                  </p>
                  <p class="mt-2 text-sm font-semibold">Consistent visual language</p>
                  <div class="mt-4 flex gap-1.5">
                    <span
                      v-for="item in paletteItems.slice(0, 5)"
                      :key="item.key"
                      class="size-6 rounded-full border"
                      :style="{ background: item.value }"
                    ></span>
                  </div>
                </div>
                <div class="border p-4 shadow-sm" :style="previewCardStyle">
                  <p class="text-xs font-bold uppercase" :style="{ color: form.colors.primary }">
                    Contact
                  </p>
                  <p class="mt-2 text-sm font-semibold">
                    {{ form.contact.email || 'hello@example.com' }}
                  </p>
                  <p class="mt-1 text-xs" :style="{ color: form.colors.muted }">
                    {{ form.contact.phone || '+62 business phone' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 border-t px-5 py-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Last updated</span>
              <span class="font-semibold text-gray-800 dark:text-gray-200">
                {{
                  branding?.updated_at ? new Date(branding.updated_at).toLocaleString('id-ID') : '-'
                }}
              </span>
            </div>
            <div class="flex gap-2">
              <BaseButton class="flex-1" type="button" :disabled="saving" @click="saveBranding">
                <Save class="size-4" />
                Save
              </BaseButton>
              <BaseButton type="button" variant="outline" @click="resetToDefault">Reset</BaseButton>
            </div>
            <a
              v-if="form.social_image_url"
              :href="form.social_image_url"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Open social image
              <ExternalLink class="size-4" />
            </a>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>
