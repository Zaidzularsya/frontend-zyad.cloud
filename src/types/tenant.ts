export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: 'trial' | 'starter' | 'growth' | 'enterprise'
  status: 'active' | 'suspended'
}
