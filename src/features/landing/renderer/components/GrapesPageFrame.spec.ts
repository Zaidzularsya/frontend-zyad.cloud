import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import GrapesPageFrame from './GrapesPageFrame.vue'

function srcdocOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('iframe').attributes('srcdoc') ?? ''
}

describe('GrapesPageFrame', () => {
  it('renders the markup inside a script-less sandboxed iframe', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: { html: '<section><h1>Hai</h1></section>', css: 'h1{color:#333}' },
    })

    const iframe = wrapper.get('iframe')
    const sandbox = iframe.attributes('sandbox') ?? ''
    expect(sandbox).toContain('allow-forms')
    expect(sandbox).not.toContain('allow-scripts')

    const doc = srcdocOf(wrapper)
    expect(doc).toContain('<h1>Hai</h1>')
    expect(doc).toContain('h1{color:#333}')
  })

  it('strips <script> and event handlers from the HTML', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<div onclick="alert(1)">x</div><script>alert(2)</script><img src=x onerror="alert(3)">',
        css: '',
      },
    })

    const doc = srcdocOf(wrapper)
    expect(doc).not.toContain('<script>')
    expect(doc).not.toContain('onclick')
    expect(doc).not.toContain('onerror')
    expect(doc).toContain('<div>x</div>')
  })

  it('scrubs @import and style-tag breakouts from the CSS', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<p>a</p>',
        css: "@import url('https://evil.test/x.css'); body{color:red} </style><script>alert(1)</script>",
      },
    })

    const doc = srcdocOf(wrapper)
    expect(doc).not.toContain('@import')
    expect(doc).not.toContain('</style><script>')
    expect(doc).toContain('body{color:red}')
  })

  it('has no default border and full width', () => {
    const wrapper = mount(GrapesPageFrame, { props: { html: '<p>a</p>', css: '' } })
    expect(wrapper.get('iframe').classes()).toContain('grapes-page-frame')
  })
})
