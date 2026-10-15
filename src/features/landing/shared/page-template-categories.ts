import type { PageTemplateCategory } from './types/page-template.types'

/** Urutan chip kategori di galeri. Kode sama dengan CHECK constraint backend. */
export const PAGE_TEMPLATE_CATEGORIES: { code: PageTemplateCategory; label: string }[] = [
  { code: 'dasar', label: 'Dasar' },
  { code: 'bisnis-jasa', label: 'Bisnis & Jasa' },
  { code: 'personal', label: 'Personal & Portofolio' },
  { code: 'acara', label: 'Acara' },
  { code: 'kesehatan', label: 'Kesehatan' },
  { code: 'pendidikan', label: 'Pendidikan' },
  { code: 'komunitas', label: 'Komunitas & Asosiasi' },
  { code: 'kuliner', label: 'Kuliner' },
  { code: 'properti', label: 'Properti' },
  { code: 'ritel-umkm', label: 'Ritel & UMKM' },
  { code: 'teknologi-isp', label: 'Teknologi & ISP' },
  { code: 'platform', label: 'Platform' },
]
