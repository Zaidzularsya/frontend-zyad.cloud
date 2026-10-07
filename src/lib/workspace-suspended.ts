import type { Router } from 'vue-router'

/** Dikirim http layer saat backend menolak request karena workspace tidak aktif (ditangguhkan). */
export const WORKSPACE_SUSPENDED_EVENT = 'workspace:suspended'

export const WORKSPACE_SUSPENDED_ROUTE = 'workspace-suspended'

/** Arahkan ke halaman penjelasan; diabaikan bila sudah di sana supaya tidak berulang antar request paralel. */
export function redirectToSuspended(router: Pick<Router, 'replace' | 'currentRoute'>) {
  if (router.currentRoute.value.name === WORKSPACE_SUSPENDED_ROUTE) return
  void router.replace({ name: WORKSPACE_SUSPENDED_ROUTE })
}
