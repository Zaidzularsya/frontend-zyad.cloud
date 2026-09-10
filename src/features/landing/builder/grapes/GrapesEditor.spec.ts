import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// jsdom cannot lay out GrapesJS' iframe canvas — mock the library and assert we
// hand it the right config + lifecycle. Real drag behaviour is covered by e2e.
const initMock = vi.fn()
const editorStub = {
  setComponents: vi.fn(),
  setStyle: vi.fn(),
  setDevice: vi.fn(),
  runCommand: vi.fn(),
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

import GrapesEditor from './GrapesEditor.vue'

describe('GrapesEditor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('initialises grapesjs once with our config on mount', () => {
    mount(GrapesEditor)
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

  it('seeds initial html/css when provided', () => {
    mount(GrapesEditor, { props: { initial: { html: '<p>hi</p>', css: 'p{color:red}' } } })
    expect(editorStub.setComponents).toHaveBeenCalledWith('<p>hi</p>')
    expect(editorStub.setStyle).toHaveBeenCalledWith('p{color:red}')
  })

  it('destroys the editor on unmount', () => {
    const wrapper = mount(GrapesEditor)
    wrapper.unmount()
    expect(editorStub.destroy).toHaveBeenCalledTimes(1)
  })

  it('switches device from the top bar', async () => {
    const wrapper = mount(GrapesEditor)
    await wrapper.findAll('.grapes-dev-btn')[1]!.trigger('click')
    expect(editorStub.setDevice).toHaveBeenCalledWith('Tablet')
  })

  it('runs undo/redo core commands from the top bar', async () => {
    const wrapper = mount(GrapesEditor)
    const [undoBtn, redoBtn] = wrapper.findAll('.grapes-icon-btn')
    await undoBtn!.trigger('click')
    await redoBtn!.trigger('click')
    expect(editorStub.runCommand).toHaveBeenCalledWith('core:undo')
    expect(editorStub.runCommand).toHaveBeenCalledWith('core:redo')
  })
})
