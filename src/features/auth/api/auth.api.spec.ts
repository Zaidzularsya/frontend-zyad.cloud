import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({
  apiClient: { get, post: vi.fn() },
}))

import { authApi } from './auth.api'

describe('authApi permissions', () => {
  beforeEach(() => get.mockReset())

  it('menggabungkan permission global dengan permission role organisasi aktif', async () => {
    get.mockResolvedValue({
      permissions: ['catalog_product.read', 'storage.object.read'],
      active_organization_permissions: ['catalog_product.read', 'catalog_product.create'],
    })

    const permissions = await authApi.permissions()

    expect(permissions.sort()).toEqual([
      'catalog_product.create',
      'catalog_product.read',
      'storage.object.read',
    ])
  })

  it('tetap bekerja bila server lama belum mengirim active_organization_permissions', async () => {
    get.mockResolvedValue({ permissions: ['catalog_product.read'] })

    expect(await authApi.permissions()).toEqual(['catalog_product.read'])
  })
})
