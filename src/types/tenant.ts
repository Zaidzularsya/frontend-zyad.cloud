export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: 'trial' | 'starter' | 'growth' | 'enterprise'
  status: 'active' | 'suspended'
  /** Tipe organisasi dari backend ('platform' | 'customer'); kosong bila tidak diketahui. */
  organizationType?: string
}
