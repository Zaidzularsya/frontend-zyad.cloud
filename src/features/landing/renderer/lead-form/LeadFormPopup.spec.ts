import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'

import LeadFormPopup from './LeadFormPopup.vue'
import { DEFAULT_PRESENTATION, type LeadFormPresentation } from './lead-form-presentation'

const mounted: VueWrapper[] = []
let target: HTMLElement

function mountPopup(
  presentation: Partial<LeadFormPresentation> = {},
  props: Record<string, unknown> = {},
) {
  const w = mount(LeadFormPopup, {
    attachTo: document.body,
    props: {
      presentation: { ...DEFAULT_PRESENTATION, display: 'popup', ...presentation },
      target,
      themeSource: null,
      ...props,
    },
    slots: {
      default: () => [
        h('input', { name: 'first' }),
        h('input', { name: 'second' }),
        h('button', { type: 'submit', class: 'last' }, 'Kirim'),
      ],
    },
  })
  mounted.push(w)
  return w
}

const launcher = () => target.querySelector<HTMLButtonElement>('.zy-lf-popup__launcher')!
const dialog = () => target.querySelector<HTMLElement>('[role="dialog"]')
const press = (key: string, init: KeyboardEventInit = {}) =>
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  )

beforeEach(() => {
  target = document.createElement('div')
  document.body.appendChild(target)
  document.documentElement.style.overflow = ''
})

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
})

describe('LeadFormPopup', () => {
  it('teleports launcher to the overlay target', () => {
    const w = mountPopup()
    expect(target.contains(launcher())).toBe(true)
    expect(w.element.querySelector?.('.zy-lf-popup__launcher') ?? null).toBeNull()
  })

  it('renders in place when there is no overlay target', () => {
    mountPopup({}, { target: null })
    expect(document.body.querySelector('.zy-lf-popup__launcher')).not.toBeNull()
  })

  it('launcher opens a dialog with role dialog, aria-modal and labelled title', async () => {
    const w = mountPopup({ popup: { ...DEFAULT_PRESENTATION.popup, title: 'Halo!' } })
    expect(dialog()).toBeNull()
    expect(launcher().getAttribute('aria-expanded')).toBe('false')
    await launcher().click()
    await w.vm.$nextTick()
    const d = dialog()!
    expect(d.getAttribute('aria-modal')).toBe('true')
    const title = document.getElementById(d.getAttribute('aria-labelledby')!)!
    expect(title.textContent).toBe('Halo!')
    expect(launcher().getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(target.querySelector('input[name="first"]'))
  })

  it('Escape and backdrop click close the dialog and return focus to the launcher', async () => {
    const w = mountPopup()
    launcher().click()
    await w.vm.$nextTick()
    press('Escape')
    await w.vm.$nextTick()
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(launcher())

    launcher().click()
    await w.vm.$nextTick()
    target.querySelector<HTMLElement>('.zy-lf-popup__backdrop')!.click()
    await w.vm.$nextTick()
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(launcher())
  })

  it('clicking inside the dialog does not close it; the close button does', async () => {
    const w = mountPopup()
    launcher().click()
    await w.vm.$nextTick()
    target.querySelector<HTMLElement>('input[name="first"]')!.click()
    await w.vm.$nextTick()
    expect(dialog()).not.toBeNull()
    target.querySelector<HTMLElement>('.zy-lf-popup__close')!.click()
    await w.vm.$nextTick()
    expect(dialog()).toBeNull()
  })

  it('traps Tab inside the dialog', async () => {
    const w = mountPopup()
    launcher().click()
    await w.vm.$nextTick()
    const close = target.querySelector<HTMLElement>('.zy-lf-popup__close')!
    const last = target.querySelector<HTMLElement>('button.last')!

    last.focus()
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    window.dispatchEvent(forward)
    expect(forward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)

    close.focus()
    const back = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(back)
    expect(back.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)

    // Di tengah daftar, Tab dibiarkan ke browser.
    target.querySelector<HTMLElement>('input[name="second"]')!.focus()
    const mid = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    window.dispatchEvent(mid)
    expect(mid.defaultPrevented).toBe(false)
  })

  it('locks page scroll while open and restores the previous value on close', async () => {
    document.documentElement.style.overflow = 'scroll'
    const w = mountPopup()
    launcher().click()
    await w.vm.$nextTick()
    expect(document.documentElement.style.overflow).toBe('hidden')
    press('Escape')
    await w.vm.$nextTick()
    expect(document.documentElement.style.overflow).toBe('scroll')
  })

  it('restores page scroll on unmount', async () => {
    document.documentElement.style.overflow = 'auto'
    const w = mountPopup()
    launcher().click()
    await w.vm.$nextTick()
    expect(document.documentElement.style.overflow).toBe('hidden')
    w.unmount()
    mounted.pop()
    expect(document.documentElement.style.overflow).toBe('auto')
  })

  it('stops listening for keys after it closes or unmounts', async () => {
    const w = mountPopup()
    launcher().click()
    await w.vm.$nextTick()
    w.unmount()
    mounted.pop()
    // Tidak melempar dan tidak mengubah apa pun.
    expect(() => press('Escape')).not.toThrow()
  })

  it('icon-only launcher keeps the label as aria-label', () => {
    mountPopup({ popup: { ...DEFAULT_PRESENTATION.popup, label: 'Chat kami' } })
    expect(launcher().getAttribute('aria-label')).toBe('Chat kami')
    expect(launcher().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('position class and icon follow the configuration', () => {
    mountPopup({
      popup: { ...DEFAULT_PRESENTATION.popup, position: 'left', icon: 'whatsapp' },
    })
    expect(target.querySelector('.zy-lf-popup')!.classList.contains('zy-lf-popup--left')).toBe(true)
    expect(launcher().querySelectorAll('svg path')).toHaveLength(1)
  })

  it('exposes open and close', async () => {
    const w = mountPopup()
    const api = w.vm as unknown as { open: () => Promise<void>; close: () => Promise<void> }
    await api.open()
    expect(dialog()).not.toBeNull()
    await api.close()
    expect(dialog()).toBeNull()
  })

  it('emits opened', async () => {
    const w = mountPopup()
    await (w.vm as unknown as { open: () => Promise<void> }).open()
    expect(w.emitted('opened')).toHaveLength(1)
  })

  it('copies page theme tokens from the sentinel so the overlay keeps the template theme', async () => {
    const host = document.createElement('div')
    const style = document.createElement('style')
    style.textContent = '.tpl { --tp-primary: #1f6f5c; --tp-radius: 10px }'
    document.head.appendChild(style)
    host.className = 'tpl'
    document.body.appendChild(host)
    const w = mountPopup({}, { themeSource: host })
    ;(w.vm as unknown as { open: () => void }).open()
    await w.vm.$nextTick()
    const root = target.querySelector<HTMLElement>('.zy-lf-popup')!
    expect(root.style.getPropertyValue('--tp-primary')).toBe('#1f6f5c')
    expect(root.style.getPropertyValue('--tp-radius')).toBe('10px')
    expect(root.style.getPropertyValue('--tp-ink')).toBe('')
  })
})
