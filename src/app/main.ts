import { createApp } from 'vue'

import App from '@/App.vue'
import { registerProviders } from '@/app/providers'
import { router } from '@/app/router'
import '@/assets/main.css'
import 'flatpickr/dist/flatpickr.css'

const app = createApp(App)

registerProviders(app)
app.use(router)
app.mount('#app')

window.addEventListener('auth:expired', () => {
  void router.replace({ name: 'login', query: { reason: 'session-expired' } })
})
