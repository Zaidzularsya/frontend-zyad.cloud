import { http } from '@/lib/http'
import type { ApiEnvelope } from '@/types/api'

export type StorageObjectClass = 'public' | 'private'

export interface StorageObject {
  id: string
  organization_id: string
  storage_key: string
  filename: string
  mime_type: string
  size_bytes: number
  class: StorageObjectClass
  label?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface StorageUsage {
  used_bytes: number
  limit_bytes?: number | null
}

export interface StorageDownloadResult {
  object_key: string
  download_url: string
  method: string
  expires_at: string
}

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise
  return response.data.data
}

export const storageApi = {
  list: () => unwrap<StorageObject[]>(http.get('/admin/storage/objects')),

  upload: (file: File, options: { class?: StorageObjectClass; label?: string } = {}) => {
    const form = new FormData()
    form.append('file', file)
    if (options.class) form.append('class', options.class)
    if (options.label) form.append('label', options.label)
    return unwrap<StorageObject>(
      http.post('/admin/storage/objects', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },

  delete: (id: string) => unwrap<null>(http.delete(`/admin/storage/objects/${id}`)),

  download: (id: string) =>
    unwrap<StorageDownloadResult>(http.get(`/admin/storage/objects/${id}/download`)),

  getUsage: () => unwrap<StorageUsage>(http.get('/admin/storage/objects/usage')),
}
