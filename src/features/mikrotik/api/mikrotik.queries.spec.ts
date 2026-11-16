import { describe, expect, it } from 'vitest'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import { mikrotikKeys, useInvalidateMikrotik } from '@/features/mikrotik/api/mikrotik.queries'

describe('useInvalidateMikrotik', () => {
  it('invalidates mikrotik queries except router-stats', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(mikrotikKeys.routerStats('r1'), { cpu_load: 1 })
    queryClient.setQueryData(mikrotikKeys.routers({}), [])

    let invalidate!: () => void
    const app = createApp({
      setup() {
        invalidate = useInvalidateMikrotik()
        return () => null
      },
    })
    app.use(VueQueryPlugin, { queryClient })
    app.mount(document.createElement('div'))

    invalidate()
    expect(queryClient.getQueryState(mikrotikKeys.routerStats('r1'))?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(mikrotikKeys.routers({}))?.isInvalidated).toBe(true)
  })
})
