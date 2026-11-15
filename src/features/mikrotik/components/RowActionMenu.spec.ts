import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

import RowActionMenu from '@/features/mikrotik/components/RowActionMenu.vue'

const items = [
  { key: 'edit', label: 'Ubah', description: 'Ganti nama router.' },
  { key: 'delete', label: 'Hapus', description: 'Hapus router.', destructive: true },
]

let mounted: VueWrapper | null = null
function mountMenu() {
  mounted = mount(RowActionMenu, {
    attachTo: document.body,
    props: { items, label: 'Aksi lain untuk Core-1' },
  })
  return mounted
}
const trigger = () =>
  document.body.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!
const menuItems = () => Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'))

describe('RowActionMenu', () => {
  afterEach(() => {
    mounted?.unmount()
    mounted = null
    document.body.innerHTML = ''
  })

  it('opens with labelled trigger and shows items with descriptions', async () => {
    mountMenu()
    expect(trigger().getAttribute('aria-label')).toBe('Aksi lain untuk Core-1')
    expect(document.body.querySelector('[role="menu"]')).toBeNull()
    trigger().click()
    await nextTick()
    expect(document.body.querySelector('[role="menu"]')).not.toBeNull()
    expect(menuItems().map((e) => e.textContent?.trim())).toEqual([
      'UbahGanti nama router.',
      'HapusHapus router.',
    ])
    expect(document.activeElement).toBe(menuItems()[0])
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    mountMenu()
    trigger().click()
    await nextTick()
    menuItems()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('moves focus with arrow keys', async () => {
    mountMenu()
    trigger().click()
    await nextTick()
    const key = (k: string) =>
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    key('ArrowDown')
    expect(document.activeElement).toBe(menuItems()[1])
    key('ArrowDown')
    expect(document.activeElement).toBe(menuItems()[0])
    key('ArrowUp')
    expect(document.activeElement).toBe(menuItems()[1])
  })

  it('emits select with the key and closes', async () => {
    const w = mountMenu()
    trigger().click()
    await nextTick()
    menuItems()[1]!.click()
    await nextTick()
    expect(w.emitted('select')).toEqual([['delete']])
    expect(document.body.querySelector('[role="menu"]')).toBeNull()
  })

  it('closes on outside click', async () => {
    mountMenu()
    trigger().click()
    await nextTick()
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('[role="menu"]')).toBeNull()
  })
})
