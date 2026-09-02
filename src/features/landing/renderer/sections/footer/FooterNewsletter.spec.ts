import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import FooterNewsletter from './FooterNewsletter.vue'
import type { FooterContent } from '../../../shared/types/landing.types'

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('@/lib/http', () => ({
  http: { post: postMock },
}))

const baseContent: FooterContent = {
  brandName: 'Acme',
  columns: [{ title: 'Company', links: [{ label: 'About', href: '/about' }] }],
  copyright: '© 2026 Acme',
}

describe('FooterNewsletter', () => {
  it('hides the newsletter block when newsletterFormId is empty', () => {
    const wrapper = mount(FooterNewsletter, { props: { content: baseContent } })
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('renders the newsletter form when newsletterFormId is provided', () => {
    const wrapper = mount(FooterNewsletter, {
      props: { content: { ...baseContent, newsletterFormId: 'form-1' } },
    })
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('submits email + consent to the public submissions endpoint', async () => {
    postMock.mockResolvedValueOnce({ data: {} })
    const wrapper = mount(FooterNewsletter, {
      props: { content: { ...baseContent, newsletterFormId: 'form-1' } },
    })

    await wrapper.find('input[type="email"]').setValue('visitor@example.com')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith('/public/landing/forms/form-1/submissions', {
      fields: { email: 'visitor@example.com' },
      consent: true,
    })
    expect(wrapper.text()).toContain('tercatat')
  })

  it('renders columns and copyright regardless of newsletter state', () => {
    const wrapper = mount(FooterNewsletter, { props: { content: baseContent } })
    expect(wrapper.text()).toContain('Company')
    expect(wrapper.text()).toContain('© 2026 Acme')
  })
})
