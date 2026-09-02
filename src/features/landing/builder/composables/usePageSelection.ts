import { ref } from 'vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type { LandingPage } from '@/features/landing/shared/types/landing.types'

// State di level module (bukan dibuat ulang tiap panggilan) supaya halaman
// Content dan Settings berbagi "sedang mengedit halaman yang mana" — pindah
// antar menu tidak mengganti konteks halaman secara diam-diam.
const pages = ref<LandingPage[]>([])
const selectedPageId = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

function getApiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

async function loadPages() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.getPages({ per_page: 100, is_template: false })
    pages.value = response.data.filter((page) => !page.is_template)
    if (!selectedPageId.value && pages.value.length > 0) {
      selectedPageId.value = pages.value[0]!.id
    }
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat daftar landing page.')
  } finally {
    isLoading.value = false
  }
}

export function usePageSelection() {
  return { pages, selectedPageId, isLoading, errorMessage, loadPages }
}
