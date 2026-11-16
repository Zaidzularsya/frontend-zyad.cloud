import type { SetupAction } from '@/features/mikrotik/types'

// Path dan kunci match mengikuti setup_service.go (backend): address-list memakai
// `list`+`address`, filter memakai `chain` (+ `comment` bila ada), NAT/proxy tunggal.
export function setupActionTitle(action: SetupAction): string {
  const match = action.match ?? {}
  switch (action.path) {
    case '/ppp/profile':
      return 'Profile isolir'
    case '/ip/pool':
      return 'IP pool isolir'
    case '/ip/firewall/address-list': {
      const base = `Address list: ${match.list ?? ''}`.trim()
      return match.address ? `${base} (${match.address})` : base
    }
    case '/ip/firewall/filter':
      return `Aturan firewall: ${match.comment || match.chain || ''}`.trim()
    case '/ip/firewall/nat':
      return 'Aturan NAT redirect'
    case '/ip/proxy/access':
      return 'Aturan proxy redirect'
    default:
      return action.path
  }
}
