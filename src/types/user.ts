export interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'invited' | 'suspended'
  lastActiveAt: string | null
}
