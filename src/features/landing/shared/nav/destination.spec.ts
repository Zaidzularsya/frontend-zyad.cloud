import { describe, expect, it } from 'vitest'

import {
  buildDestination,
  destinationForApi,
  formFromItem,
  hrefForItem,
  normalizeLinkType,
} from './destination'

describe('nav destination helpers', () => {
  it('normalizeLinkType falls back to internal_page for unknown values', () => {
    expect(normalizeLinkType('anchor')).toBe('anchor')
    expect(normalizeLinkType('button')).toBe('button')
    expect(normalizeLinkType('weird')).toBe('internal_page')
  })

  it('buildDestination renders human routes', () => {
    expect(
      buildDestination({
        link_type: 'internal_page',
        slug: 'pricing',
        anchor: '',
        externalUrl: '',
      }),
    ).toBe('/pricing')
    expect(
      buildDestination({
        link_type: 'internal_page',
        slug: 'public-marketing',
        anchor: '',
        externalUrl: '',
      }),
    ).toBe('/')
    expect(
      buildDestination({ link_type: 'anchor', slug: '', anchor: '#faq', externalUrl: '' }),
    ).toBe('#faq')
    expect(
      buildDestination({
        link_type: 'external_link',
        slug: '',
        anchor: '',
        externalUrl: 'https://a.test',
      }),
    ).toBe('https://a.test')
  })

  it('destinationForApi stores internal pages as a bare slug', () => {
    expect(
      destinationForApi({
        link_type: 'internal_page',
        slug: 'pricing',
        anchor: '',
        externalUrl: '',
      }),
    ).toBe('pricing')
    expect(destinationForApi({ link_type: 'button', slug: '/', anchor: '', externalUrl: '' })).toBe(
      'public-marketing',
    )
    expect(
      destinationForApi({ link_type: 'anchor', slug: '', anchor: 'faq', externalUrl: '' }),
    ).toBe('#faq')
  })

  it('hrefForItem round-trips a persisted item', () => {
    expect(hrefForItem({ link_type: 'internal_page', destination: 'pricing' })).toBe('/pricing')
    expect(hrefForItem({ link_type: 'internal_page', destination: 'public-marketing' })).toBe('/')
    expect(hrefForItem({ link_type: 'anchor', destination: 'faq' })).toBe('#faq')
    expect(hrefForItem({ link_type: 'external_link', destination: 'https://a.test' })).toBe(
      'https://a.test',
    )
  })

  it('formFromItem inverts destinationForApi', () => {
    const seeded = formFromItem({ link_type: 'internal_page', destination: 'pricing' })
    expect(seeded).toEqual({
      link_type: 'internal_page',
      slug: 'pricing',
      anchor: '',
      externalUrl: '',
    })
    expect(destinationForApi(seeded)).toBe('pricing')
  })
})
