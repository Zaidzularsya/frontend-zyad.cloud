import type { RouteLocationRaw } from 'vue-router'

// Satu-satunya tempat yang menentukan tujuan "Upgrade plan".
// 'billing' = halaman Langganan (pemilih paket → checkout self-serve).
export function upgradeTarget(): RouteLocationRaw {
  return { name: 'billing' }
}
