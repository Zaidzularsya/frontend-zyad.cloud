import { describe, expect, it } from 'vitest'

import {
  CONTROL_OWNER_ONLY_TOOLTIP,
  controlPermissions,
} from '@/features/mikrotik/utils/control-permissions'

describe('controlPermissions', () => {
  it('owner boleh baca, ubah, dan pulihkan', () => {
    const p = controlPermissions([
      'mikrotik_control.read',
      'mikrotik_control.update',
      'mikrotik_control.restore',
    ])
    expect(p).toEqual({ canRead: true, canUpdate: true, canRestore: true, disabledReason: null })
  })

  it('member hanya baca dan mendapat tooltip persis', () => {
    const p = controlPermissions(['mikrotik_control.read'])
    expect(p.canRead).toBe(true)
    expect(p.canUpdate).toBe(false)
    expect(p.canRestore).toBe(false)
    expect(p.disabledReason).toBe('Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.')
    expect(CONTROL_OWNER_ONLY_TOOLTIP).toBe(p.disabledReason)
  })

  it('tanpa izin apa pun tidak bisa membaca', () => {
    expect(controlPermissions([]).canRead).toBe(false)
  })
})
