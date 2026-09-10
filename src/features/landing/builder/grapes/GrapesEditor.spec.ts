import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// jsdom cannot lay out GrapesJS' iframe canvas — mock the library and assert we
// hand it the right config + lifecycle. Real drag behaviour is covered by e2e.
const initMock = vi.fn()
const editorStub = {
  getProjectData: vi.fn(() => ({ pages: [] })),
  getHtml: vi.fn(() => '<body></body>'),
  getCss: vi.fn(() => ''),
  loadProjectData: vi.fn(),
  setDevice: vi.fn(),
  runCommand: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('grapesjs', () => ({
  default: {
    init: (...args: unknown[]) => {
      initMock(...args)
      return editorStub
    },
  },
}))
vi.mock('grapesjs/dist/css/grapes.min.css', () => ({}))
vi.mock('grapesjs-blocks-basic', () => ({ default: vi.fn() }))
vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }))

const getDocument = vi.fn()
const saveDocument = vi.fn()
const publishPage = vi.fn()
vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getDocument: (...a: unknown[]) => getDocument(...a),
    saveDocument: (...a: unknown[]) => saveDocument(...a),
    publishPage: (...a: unknown[]) => publishPage(...a),
  },
}))

import GrapesEditor from './GrapesEditor.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('GrapesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    getDocument.mockResolvedValue({
      data: { landing_page_id: 'p1', project: {}, html: '', css: '', updated_at: '' },
    })
    saveDocument.mockResolvedValue({ data: { updated_at: '2026-09-10T00:00:00Z' } })
    publishPage.mockResolvedValue({ data: {} })
  })

  it('initialises grapesjs once with our config on mount', () => {
    mount(GrapesEditor, { props: { pageId: 'p1' } })
    expect(initMock).toHaveBeenCalledTimes(1)
    const cfg = initMock.mock.calls[0]![0] as Record<string, unknown> & {
      storageManager: unknown
      i18n: { locale: string }
      deviceManager: { devices: unknown[] }
      container: unknown
      blockManager: { appendTo: unknown }
    }
    expect(cfg.storageManager).toEqual({ type: 'none' })
    expect(cfg.i18n.locale).toBe('id')
    expect(cfg.deviceManager.devices).toHaveLength(3)
    expect(cfg.container).toBeInstanceOf(HTMLElement)
    expect(cfg.blockManager.appendTo).toBeInstanceOf(HTMLElement)
  })

  it('loads the page document on mount', async () => {
    mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()
    expect(getDocument).toHaveBeenCalledWith('p1')
  })

  it('destroys the editor on unmount', () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    wrapper.unmount()
    expect(editorStub.destroy).toHaveBeenCalledTimes(1)
  })

  it('switches device from the top bar', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await wrapper.findAll('.grapes-dev-btn')[1]!.trigger('click')
    expect(editorStub.setDevice).toHaveBeenCalledWith('Tablet')
  })

  it('runs undo/redo core commands from the top bar', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    const [undoBtn, redoBtn] = wrapper.findAll('.grapes-icon-btn')
    await undoBtn!.trigger('click')
    await redoBtn!.trigger('click')
    expect(editorStub.runCommand).toHaveBeenCalledWith('core:undo')
    expect(editorStub.runCommand).toHaveBeenCalledWith('core:redo')
  })

  it('publishes via the store from the top bar', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()
    await wrapper.find('.grapes-publish').trigger('click')
    await flush()
    expect(publishPage).toHaveBeenCalledWith('p1')
  })
})
