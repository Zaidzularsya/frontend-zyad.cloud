import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ElementImage from './ElementImage.vue'

function render(content: Record<string, unknown>, style?: Record<string, unknown>) {
  return mount(ElementImage, { props: { content, styleConfig: style } })
}

describe('ElementImage', () => {
  it('shows a placeholder until a src is set', () => {
    const wrapper = render({})
    expect(wrapper.find('.element-image').exists()).toBe(false)
    expect(wrapper.find('.element-image-placeholder').exists()).toBe(true)
  })

  it('renders the image with alt text once a src exists', () => {
    const wrapper = render({ src: '/photo.jpg', alt: 'Foto tim' })
    const img = wrapper.find('img.element-image')
    expect(img.attributes('src')).toBe('/photo.jpg')
    expect(img.attributes('alt')).toBe('Foto tim')
  })

  it('maps box style: radius, styled border, height and object-fit', () => {
    const wrapper = render(
      { src: '/photo.jpg' },
      {
        box: {
          radius: 16,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: '#ff0000',
          height: 240,
          objectFit: 'cover',
        },
      },
    )
    const style = wrapper.find('img.element-image').attributes('style') ?? ''
    expect(style).toContain('border-radius: 16px')
    // jsdom normalises the hex colour to rgb() in the serialised style string.
    expect(style).toContain('border: 2px dashed rgb(255, 0, 0)')
    expect(style).toContain('height: 240px')
    expect(style).toContain('object-fit: cover')
  })

  it('defaults the border style to solid when only width + colour are set', () => {
    const wrapper = render({ src: '/photo.jpg' }, { box: { borderWidth: 1, borderColor: '#000' } })
    expect(wrapper.find('img.element-image').attributes('style')).toContain(
      'border: 1px solid rgb(0, 0, 0)',
    )
  })
})
