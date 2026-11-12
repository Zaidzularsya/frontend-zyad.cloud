import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/app/crm/contacts', query: {} }) }))
vi.mock('@/features/entitlements/api/entitlements.api', () => ({
  entitlementsApi: { summary: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/features/crm/companies/api/companies.api', () => ({
  companiesApi: { list: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }) },
}))
const create = vi.hoisted(() => vi.fn())
vi.mock('@/features/crm/contacts/api/contacts.api', () => ({
  contactsApi: {
    create,
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'a',
          first_name: 'Budi',
          email: 'Budi@b.com',
          phone: '0812-3456-7890',
          tags: [],
          address: {},
          is_customer: false,
          lifecycle_stage: 'contact',
          created_at: '',
          updated_at: '',
        },
        {
          id: 'b',
          first_name: 'Budi 2',
          email: 'budi@b.com',
          phone: '',
          tags: [],
          address: {},
          is_customer: false,
          lifecycle_stage: 'contact',
          created_at: '',
          updated_at: '',
        },
        {
          id: 'c',
          first_name: 'Sari',
          email: '',
          phone: '+62 899 1111 2222',
          tags: [],
          address: {},
          is_customer: false,
          lifecycle_stage: 'contact',
          created_at: '',
          updated_at: '',
        },
      ],
      meta: { total: 3, page: 1, per_page: 20, total_pages: 1 },
    }),
  },
}))

import ContactsPage from './ContactsPage.vue'

describe('ContactsPage', () => {
  it('daftar kontak menampilkan telepon dan menandai duplikat', async () => {
    const w = mount(ContactsPage, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: { RouterLink: { template: '<a><slot /></a>' }, QuotaActionButton: true },
      },
    })
    await flushPromises()
    const rows = w.findAll('tbody tr')
    expect(rows[0]!.text()).toContain('Budi@b.com')
    expect(rows[0]!.text()).toContain('0812-3456-7890')
    expect(rows[2]!.text()).toContain('+62 899 1111 2222')
    expect(rows[0]!.find('[data-testid="duplicate-badge"]').exists()).toBe(true)
    expect(rows[1]!.find('[data-testid="duplicate-badge"]').exists()).toBe(true)
    expect(rows[2]!.find('[data-testid="duplicate-badge"]').exists()).toBe(false)
  })

  it('galat duplikat menampilkan kontak lama', async () => {
    create.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          code: 'CONTACT_DUPLICATE',
          message: 'Kontak dengan email atau nomor WhatsApp yang sama sudah ada.',
          data: { existing: { id: 'c-old', name: 'Budi Lama', email: 'b@b.com', phone: '' } },
        },
      },
    })
    const w = mount(ContactsPage, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="String(to)"><slot /></a>' },
          QuotaActionButton: {
            emits: ['click'],
            template: '<button data-testid="new-contact" @click="$emit(\'click\')">baru</button>',
          },
          BaseModal: { props: ['open', 'title'], template: '<div v-if="open"><slot /></div>' },
        },
      },
    })
    await flushPromises()
    await w.get('[data-testid="new-contact"]').trigger('click')
    await w.get('input[name="first_name"]').setValue('Budi')
    await w.get('form').trigger('submit')
    await flushPromises()
    const link = w.get('a[data-testid="duplicate-contact-link"]')
    expect(link.text()).toContain('Budi Lama')
    expect(link.attributes('href')).toBe('/app/crm/contacts/c-old')
  })
})
