import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import OnboardingChecklist from '@/features/mikrotik/components/OnboardingChecklist.vue'
import { onboarding } from '@/features/mikrotik/testing/fixtures'

describe('OnboardingChecklist', () => {
  it('renders five steps and marks the first not-done step active', () => {
    const w = mount(OnboardingChecklist, {
      props: { status: onboarding({ router_registered: true }) },
    })
    expect(w.findAll('[data-step]')).toHaveLength(5)
    const active = w.findAll('[data-active="true"]')
    expect(active).toHaveLength(1)
    expect(active[0]?.attributes('data-step')).toBe('setup')
    expect(w.text()).toContain('Isolir otomatis belum aktif sampai langkah 3-5 selesai.')
  })

  it('shows import figures and emits navigate for the step key', async () => {
    const w = mount(OnboardingChecklist, {
      props: {
        status: onboarding({
          router_registered: true,
          router_ready: true,
          secrets_total: 85,
          secrets_paired: 0,
        }),
      },
    })
    expect(w.text()).toContain('85 diimpor, 0 terpasang')
    expect(w.get('[data-step="secrets"]').attributes('data-active')).toBe('true')
    await w.get('[data-step="secrets"] button').trigger('click')
    expect(w.emitted('navigate')?.[0]).toEqual(['secrets'])
  })

  it('treats secrets step as done only when paired and no profile missing', () => {
    const w = mount(OnboardingChecklist, {
      props: {
        status: onboarding({
          router_registered: true,
          router_ready: true,
          secrets_total: 5,
          secrets_paired: 2,
          secrets_needs_profile: 1,
        }),
      },
    })
    expect(w.get('[data-step="secrets"]').attributes('data-done')).toBe('false')
  })
})
