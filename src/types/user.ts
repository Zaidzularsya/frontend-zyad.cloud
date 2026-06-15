export interface User {
  id: string
  name: string
  email: string
  username?: string
  phone?: string | null
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'banned' | 'deleted' | 'invited'
  email_verified_at?: string | null
  phone_verified_at?: string | null
  last_login_at?: string | null
  roles: string[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}
