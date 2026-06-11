const TENANT_KEY = 'zyad.active-tenant'

export const tenantStorage = {
  get: () => localStorage.getItem(TENANT_KEY),
  set: (tenantId: string) => localStorage.setItem(TENANT_KEY, tenantId),
  clear: () => localStorage.removeItem(TENANT_KEY),
}
