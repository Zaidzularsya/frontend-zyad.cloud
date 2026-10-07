import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

import GrapesAnimationPanel from './GrapesAnimationPanel.vue'

function fakeComponent(initial: string[] = []) {
  const classes = [...initial]
  return {
    classes,
    getClasses: () => [...classes],
    addClass: vi.fn((c: string | string[]) => {
      for (const x of Array.isArray(c) ? c : [c]) if (!classes.includes(x)) classes.push(x)
    }),
    removeClass: vi.fn((c: string | string[]) => {
      for (const x of Array.isArray(c) ? c : [c]) {
        const i = classes.indexOf(x)
        if (i >= 0) classes.splice(i, 1)
      }
    }),
  }
}

describe('GrapesAnimationPanel', () => {
  it('shows the current choices read from getClasses()', () => {
    const c = fakeComponent(['card', 'zy-anim-zoom-in', 'zy-delay-300', 'zy-stagger'])
    const w = mount(GrapesAnimationPanel, { props: { component: c } })
    expect((w.get('select[data-group="entrance"]').element as HTMLSelectElement).value).toBe(
      'zy-anim-zoom-in',
    )
    expect((w.get('select[data-group="delay"]').element as HTMLSelectElement).value).toBe(
      'zy-delay-300',
    )
    expect((w.get('input[data-group="stagger"]').element as HTMLInputElement).checked).toBe(true)
    expect((w.get('input[data-group="tilt"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('has Indonesian labels connected to controls and switch role', () => {
    const w = mount(GrapesAnimationPanel, { props: { component: fakeComponent() } })
    const text = w.text()
    for (const t of [
      'Efek masuk',
      'Delay',
      'Durasi',
      'Stagger anak',
      'Parallax',
      'Tilt 3D',
      'Hover',
      'Muncul dari bawah',
      'Geser dari kiri',
      'Geser dari kanan',
      'Blur ke jelas',
      'Wipe',
      '800 ms',
      'Lambat',
      'Glow',
    ]) {
      expect(text).toContain(t)
    }
    for (const s of w.findAll('select')) expect(s.element.closest('label')).not.toBeNull()
    expect(w.findAll('input[role="switch"]')).toHaveLength(2)
    expect(w.get('input[data-group="tilt"]').element.closest('label')?.textContent).toContain(
      'Tilt 3D',
    )
  })

  it('selecting "Membesar" removes the old class, adds the new one and emits changed', async () => {
    const c = fakeComponent(['zy-anim-fade-up'])
    const w = mount(GrapesAnimationPanel, { props: { component: c } })
    await w.get('select[data-group="entrance"]').setValue('zy-anim-zoom-in')
    expect(c.removeClass).toHaveBeenCalledWith(['zy-anim-fade-up'])
    expect(c.addClass).toHaveBeenCalledWith(['zy-anim-zoom-in'])
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('changing the effect repeatedly leaves one entrance class', async () => {
    const c = fakeComponent(['card'])
    const w = mount(GrapesAnimationPanel, { props: { component: c } })
    const sel = w.get('select[data-group="entrance"]')
    for (const v of ['zy-anim-fade-up', 'zy-anim-zoom-in', 'zy-anim-blur-in', 'zy-anim-fade-up']) {
      await sel.setValue(v)
    }
    expect(c.classes).toEqual(['card', 'zy-anim-fade-up'])
    await sel.setValue('')
    expect(c.classes).toEqual(['card'])
  })

  it('stagger and tilt toggles add and remove their class', async () => {
    const c = fakeComponent([])
    const w = mount(GrapesAnimationPanel, { props: { component: c } })
    await w.get('input[data-group="stagger"]').setValue(true)
    await w.get('input[data-group="tilt"]').setValue(true)
    expect(c.classes).toEqual(['zy-stagger', 'zy-tilt'])
    await w.get('input[data-group="stagger"]').setValue(false)
    await w.get('input[data-group="tilt"]').setValue(false)
    expect(c.classes).toEqual([])
    expect(w.emitted('changed')).toHaveLength(4)
  })

  it('leaves hero/ambient classes alone', async () => {
    const c = fakeComponent(['zy-anim-hero', 'zy-aurora', 'zy-anim-fade-up'])
    const w = mount(GrapesAnimationPanel, { props: { component: c } })
    await w.get('select[data-group="entrance"]').setValue('')
    expect(c.classes).toEqual(['zy-anim-hero', 'zy-aurora'])
  })
})
