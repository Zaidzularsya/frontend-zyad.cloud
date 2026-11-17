import { beforeEach, describe, expect, it } from 'vitest'

import { activateAsyncStylesheets } from './async-stylesheets'

function addLink(): HTMLLinkElement {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.media = 'print'
  link.setAttribute('data-async-stylesheet', '')
  document.head.appendChild(link)
  return link
}

describe('activateAsyncStylesheets', () => {
  beforeEach(() => {
    document.head.querySelectorAll('link[data-async-stylesheet]').forEach((l) => l.remove())
  })

  it('switches to media=all only after the stylesheet loaded', () => {
    const link = addLink()
    activateAsyncStylesheets()
    expect(link.media).toBe('print')
    link.dispatchEvent(new Event('load'))
    expect(link.media).toBe('all')
  })

  it('leaves an unreachable stylesheet non-blocking', () => {
    const link = addLink()
    activateAsyncStylesheets()
    link.dispatchEvent(new Event('error'))
    expect(link.media).toBe('print')
  })

  it('ignores ordinary stylesheets', () => {
    const plain = document.createElement('link')
    plain.rel = 'stylesheet'
    plain.media = 'screen'
    document.head.appendChild(plain)
    activateAsyncStylesheets()
    plain.dispatchEvent(new Event('load'))
    expect(plain.media).toBe('screen')
    plain.remove()
  })
})
