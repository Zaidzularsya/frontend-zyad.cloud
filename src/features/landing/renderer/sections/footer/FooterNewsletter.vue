<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BrandLogo from '@/features/branding/components/BrandLogo.vue'
import { http } from '@/lib/http'
import { useEditMode } from '../../composables/useEditMode'
import type { FooterContent } from '../../../shared/types/landing.types'

const editMode = useEditMode()

const props = defineProps<{
  content: FooterContent
}>()

const columnGridClass = computed(() => {
  const count = props.content.columns?.length ?? 0
  if (count >= 3) return 'grid-cols-2 sm:grid-cols-3'
  if (count === 2) return 'grid-cols-2'
  return 'grid-cols-1'
})

const logoLoadFailed = ref(false)
watch(
  () => props.content.logoUrl,
  () => {
    logoLoadFailed.value = false
  },
)

const email = ref('')
const consent = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const submitError = ref('')

async function submitNewsletter() {
  if (editMode.value) return
  if (!props.content.newsletterFormId || submitting.value) return
  submitError.value = ''
  submitting.value = true
  try {
    await http.post(`/public/landing/forms/${props.content.newsletterFormId}/submissions`, {
      fields: { email: email.value },
      consent: consent.value,
    })
    submitted.value = true
    email.value = ''
  } catch (err) {
    console.error('FooterNewsletter: failed to submit', err)
    submitError.value = 'Gagal mengirim, silakan coba lagi.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <footer class="bg-surface-container-lowest border-t border-outline-variant/30 py-16">
    <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
      <!-- Newsletter -->
      <div
        v-if="content.newsletterFormId"
        class="mb-16 rounded-2xl bg-surface-container p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
      >
        <div>
          <h4 class="font-headline-md text-xl text-primary mb-2">Berlangganan update</h4>
          <p class="font-body-md text-on-surface-variant max-w-md">
            Dapatkan info terbaru langsung ke email Anda.
          </p>
        </div>

        <form
          v-if="!submitted"
          class="flex flex-col sm:flex-row gap-3 w-full md:w-auto"
          @submit.prevent="submitNewsletter"
        >
          <div class="flex flex-col gap-2">
            <input
              v-model="email"
              type="email"
              required
              placeholder="Alamat email"
              class="rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm outline-none focus:border-secondary sm:w-64"
            />
            <label class="flex items-center gap-2 text-xs text-on-surface-variant">
              <input v-model="consent" type="checkbox" required />
              Saya setuju menerima informasi via email.
            </label>
          </div>
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-on-secondary disabled:opacity-60 h-fit"
          >
            {{ submitting ? 'Mengirim...' : 'Subscribe' }}
          </button>
        </form>
        <p v-else class="font-body-md text-secondary text-sm font-medium">
          Terima kasih, email Anda sudah tercatat.
        </p>
        <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
        <!-- Brand Info -->
        <div class="md:col-span-4">
          <div class="flex items-center gap-2 mb-6">
            <img
              v-if="content.logoUrl && !logoLoadFailed"
              :src="content.logoUrl"
              :alt="content.brandName"
              class="h-10 w-auto object-contain"
              @error="logoLoadFailed = true"
            />
            <BrandLogo v-else class="h-10" />
            <span class="font-display-xl text-2xl font-bold tracking-tight text-primary">{{
              content.brandName
            }}</span>
          </div>
          <p class="font-body-md text-on-surface-variant max-w-sm">
            {{ content.description }}
          </p>
        </div>

        <!-- Links Columns -->
        <div class="md:col-span-8 grid gap-8" :class="columnGridClass">
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
