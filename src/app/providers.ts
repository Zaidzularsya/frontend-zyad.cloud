import type { App } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'

import { queryClient } from '@/lib/query-client'

export function registerProviders(app: App) {
  app.use(createPinia())
  app.use(VueQueryPlugin, { queryClient })
}
