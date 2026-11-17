import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const m = vi.hoisted(() => ({
  companyDelete: vi.fn(),
  companyRestore: vi.fn(),
  contactDelete: vi.fn(),
  contactRestore: vi.fn(),
  dealDelete: vi.fn(),
  dealWon: vi.fn(),
  dealLost: vi.fn(),
  pipeDelete: vi.fn(),
  pipeRestore: vi.fn(),
  pipeArchive: vi.fn(),
  quotationDelete: vi.fn(),
  quotationApprove: vi.fn(),
  soCancel: vi.fn(),
  invoiceVoid: vi.fn(),
}))

vi.mock('@/features/crm/companies/api/companies.api', () => ({
  companiesApi: { delete: m.companyDelete, restore: m.companyRestore },
}))
vi.mock('@/features/crm/contacts/api/contacts.api', () => ({
  contactsApi: { delete: m.contactDelete, restore: m.contactRestore },
}))
vi.mock('@/features/crm/deals/api/deals.api', () => ({
  dealsApi: { delete: m.dealDelete, closeWon: m.dealWon, closeLost: m.dealLost },
}))
vi.mock('@/features/crm/pipelines/api/pipelines.api', () => ({
  pipelinesApi: { delete: m.pipeDelete, restore: m.pipeRestore, archive: m.pipeArchive },
}))
vi.mock('@/features/crm/quotations/api/quotations.api', () => ({
  quotationsApi: { delete: m.quotationDelete, approve: m.quotationApprove },
}))
vi.mock('@/features/crm/sales-orders/api/sales-orders.api', () => ({
  salesOrdersApi: { cancel: m.soCancel },
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { invoices: { void: m.invoiceVoid } },
}))

import {
  useDeleteCompanyMutation,
  useRestoreCompanyMutation,
} from './companies/api/companies.queries'
import {
  useDeleteContactMutation,
  useRestoreContactMutation,
} from './contacts/api/contacts.queries'
import {
  useCloseDealLostMutation,
  useCloseDealWonMutation,
  useDeleteDealMutation,
} from './deals/api/deals.queries'
import {
  useArchivePipelineMutation,
  useDeletePipelineMutation,
  useRestorePipelineMutation,
} from './pipelines/api/pipelines.queries'
import {
  useApproveQuotationMutation,
  useDeleteQuotationMutation,
} from './quotations/api/quotations.queries'
import { useCancelSalesOrderMutation } from './sales-orders/api/sales-orders.queries'
import { useVoidInvoiceMutation } from '@/features/receivable/api/receivable.queries'

function run(hook: () => { mutateAsync: (v: never) => Promise<unknown> }) {
  const client = new QueryClient()
  const spy = vi.spyOn(client, 'invalidateQueries')
  let mutation!: ReturnType<typeof hook>
  mount(
    defineComponent({
      setup() {
        mutation = hook()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } },
  )
  return { mutation, spy }
}

const entitlementCalls = (spy: ReturnType<typeof run>['spy']) =>
  spy.mock.calls.filter(([f]) => (f as { queryKey?: unknown[] })?.queryKey?.[0] === 'entitlements')

const cases = [
  ['useDeleteCompanyMutation', useDeleteCompanyMutation, m.companyDelete],
  ['useRestoreCompanyMutation', useRestoreCompanyMutation, m.companyRestore],
  ['useDeleteContactMutation', useDeleteContactMutation, m.contactDelete],
  ['useRestoreContactMutation', useRestoreContactMutation, m.contactRestore],
  ['useDeleteDealMutation', useDeleteDealMutation, m.dealDelete],
  ['useCloseDealWonMutation', useCloseDealWonMutation, m.dealWon],
  ['useCloseDealLostMutation', useCloseDealLostMutation, m.dealLost],
  ['useDeletePipelineMutation', useDeletePipelineMutation, m.pipeDelete],
  ['useRestorePipelineMutation', useRestorePipelineMutation, m.pipeRestore],
  ['useArchivePipelineMutation', useArchivePipelineMutation, m.pipeArchive],
  ['useDeleteQuotationMutation', useDeleteQuotationMutation, m.quotationDelete],
  ['useApproveQuotationMutation', useApproveQuotationMutation, m.quotationApprove],
  ['useCancelSalesOrderMutation', useCancelSalesOrderMutation, m.soCancel],
  ['useVoidInvoiceMutation', useVoidInvoiceMutation, m.invoiceVoid],
] as const

describe.each(cases)('%s', (_name, hook, api) => {
  it('invalidates the entitlement summary on success', async () => {
    api.mockResolvedValue({})
    const { mutation, spy } = run(hook as never)
    await mutation.mutateAsync({ id: 'x', reason: 'r' } as never)
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(1)
  })
})

describe('useApproveQuotationMutation quota 409', () => {
  it('invalidates the entitlement summary when staff approve hits QUOTA_EXCEEDED', async () => {
    m.quotationApprove.mockRejectedValue({
      response: { status: 409, data: { code: 'QUOTA_EXCEEDED' } },
    })
    const { mutation, spy } = run(useApproveQuotationMutation as never)
    await expect(mutation.mutateAsync('q1' as never)).rejects.toBeTruthy()
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(1)
  })
})
