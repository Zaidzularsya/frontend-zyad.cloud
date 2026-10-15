import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/env')>()),
  platformHost: 'zyad.cloud',
}))

import MarketingLandingPage from './MarketingLandingPage.vue'

const DynamicStub = {
  name: 'DynamicLandingPage',
  props: ['slug', 'home'],
  template: '<div />',
}

function setHostname(hostname: string) {
  vi.stubGlobal('location', { ...window.location, hostname })
}

function mountPage() {
  return mount(MarketingLandingPage, { global: { stubs: { DynamicLandingPage: DynamicStub } } })
}

describe('MarketingLandingPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses home mode on the platform host', () => {
    setHostname('zyad.cloud')
    const props = mountPage().findComponent(DynamicStub).props()
    expect(props.home).toBe(true)
    expect(props.slug).toBeUndefined()
  })

  it('resolves by host on tenant domains', () => {
    setHostname('toko.example.com')
    const props = mountPage().findComponent(DynamicStub).props()
    expect(props.home).toBeFalsy()
    expect(props.slug).toBeUndefined()
  })
})
