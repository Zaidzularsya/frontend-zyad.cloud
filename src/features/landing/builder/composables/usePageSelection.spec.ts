import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePageSelection } from './usePageSelection'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/http', () => ({
  http: { get: getMock },
}))

function apiResponse(pages: Array<Record<string, unknown>>) {
  return {
    data: {
      success: true,
      message: '',
      data: pages,
    },
  }
}

describe('usePageSelection', () => {
  beforeEach(() => {
    getMock.mockReset()
    const { pages, selectedPageId, errorMessage } = usePageSelection()
    pages.value = []
    selectedPageId.value = ''
    errorMessage.value = ''
  })

  it('loads pages and filters out template pages', async () => {
    getMock.mockResolvedValueOnce(
      apiResponse([
        { id: 'page-1', name: 'Home', is_template: false },
        { id: 'page-2', name: 'Promo Template', is_template: true },
      ]),
    )

    const { pages, loadPages } = usePageSelection()
    await loadPages()

    expect(pages.value).toHaveLength(1)
    expect(pages.value[0]!.id).toBe('page-1')
  })

  it('auto-selects the first page when nothing is selected yet', async () => {
    getMock.mockResolvedValueOnce(apiResponse([{ id: 'page-1', name: 'Home', is_template: false }]))

    const { selectedPageId, loadPages } = usePageSelection()
    await loadPages()

    expect(selectedPageId.value).toBe('page-1')
  })

  it('keeps an existing selection across reloads instead of overriding it', async () => {
    getMock.mockResolvedValueOnce(
      apiResponse([
        { id: 'page-1', name: 'Home', is_template: false },
        { id: 'page-2', name: 'About', is_template: false },
      ]),
    )
    const { selectedPageId, loadPages } = usePageSelection()
    selectedPageId.value = 'page-2'

    await loadPages()

    expect(selectedPageId.value).toBe('page-2')
  })

  it('sets errorMessage from the API response and clears isLoading on failure', async () => {
    getMock.mockRejectedValueOnce({ response: { data: { message: 'Gagal ambil data' } } })

    const { errorMessage, isLoading, loadPages } = usePageSelection()
    await loadPages()

    expect(errorMessage.value).toBe('Gagal ambil data')
    expect(isLoading.value).toBe(false)
  })

  it('falls back to a generic message when the API error has no message', async () => {
    getMock.mockRejectedValueOnce(new Error('network down'))

    const { errorMessage, loadPages } = usePageSelection()
    await loadPages()

    expect(errorMessage.value).toBe('Gagal memuat daftar landing page.')
  })
})
