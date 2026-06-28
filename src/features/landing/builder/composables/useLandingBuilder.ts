import { ref } from 'vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type { LandingPage, LandingSection } from '@/features/landing/shared/types/landing.types'

/**
 * Composable untuk operasi umum landing builder.
 * Dapat dipakai di berbagai builder pages sebagai shared state/logic.
 */
export function useLandingBuilder() {
  const pages = ref<LandingPage[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')

  async function loadPages(params?: Record<string, string | number | boolean | undefined | null>) {
    loading.value = true
    errorMessage.value = ''
    try {
      const response = await landingApi.getPages({ per_page: 100, ...params })
      pages.value = response.data
    } catch (error) {
      errorMessage.value = getApiMessage(error, 'Gagal memuat daftar landing page.')
    } finally {
      loading.value = false
    }
  }

  async function publishPage(pageId: string): Promise<boolean> {
    saving.value = true
    errorMessage.value = ''
    try {
      await landingApi.publishPage(pageId)
      return true
    } catch (error) {
      errorMessage.value = getApiMessage(error, 'Gagal mempublish halaman.')
      return false
    } finally {
      saving.value = false
    }
  }

  async function unpublishPage(pageId: string): Promise<boolean> {
    saving.value = true
    errorMessage.value = ''
    try {
      await landingApi.unpublishPage(pageId)
      return true
    } catch (error) {
      errorMessage.value = getApiMessage(error, 'Gagal meng-unpublish halaman.')
      return false
    } finally {
      saving.value = false
    }
  }

  async function deletePage(pageId: string): Promise<boolean> {
    saving.value = true
    errorMessage.value = ''
    try {
      await landingApi.deletePage(pageId)
      return true
    } catch (error) {
      errorMessage.value = getApiMessage(error, 'Gagal menghapus halaman.')
      return false
    } finally {
      saving.value = false
    }
  }

  async function getSections(pageId: string): Promise<LandingSection[]> {
    try {
      const response = await landingApi.getSections(pageId)
      return response.data
    } catch {
      return []
    }
  }

  function getApiMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'response' in error) {
      const response = (error as { response?: { data?: { message?: string } } }).response
      return response?.data?.message ?? fallback
    }
    return fallback
  }

  return {
    pages,
    loading,
    saving,
    errorMessage,
    loadPages,
    publishPage,
    unpublishPage,
    deletePage,
    getSections,
  }
}
