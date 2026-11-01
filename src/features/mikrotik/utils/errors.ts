export interface TaskErrorAction {
  message: string
  action: string
}

// Sumber: runbook-mikrotik-isolir-setup.md bagian 14.4. Kode di luar tabel jatuh ke `unknown`.
const UNKNOWN_ERROR: TaskErrorAction = {
  message: 'Terjadi kegagalan tak terduga yang sudah diulang otomatis.',
  action: 'Coba lagi. Bila tetap gagal, hubungi admin platform untuk memeriksa log worker.',
}

const TASK_ERRORS: Record<string, TaskErrorAction> = {
  auth_failed: {
    message: 'Router menolak kredensial.',
    action: 'Perbarui username/password router, lalu coba lagi.',
  },
  tls_untrusted: {
    message: 'Sertifikat TLS router tidak dipercaya.',
    action: 'Periksa sertifikat router, atur atau ubah fingerprint TLS, lalu coba lagi.',
  },
  host_not_allowed: {
    message: 'Host router ditolak oleh kebijakan host.',
    action:
      'Periksa host router dan daftar jaringan privat yang diizinkan, perbaiki, lalu coba lagi.',
  },
  secret_missing: {
    message: 'PPP secret tidak ada lagi di router.',
    action:
      'Impor ulang secret dari router. Jika secret memang dihapus, lepas pairing atau buat ulang secret lalu impor.',
  },
  profile_missing: {
    message: 'Profile asal pelanggan tidak ada di router.',
    action: 'Buat profile itu di router atau tetapkan profile asal lain, lalu coba lagi.',
  },
  restore_target_invalid: {
    message: 'Profile asal kosong atau sama dengan profile isolir.',
    action: 'Tetapkan profile asal yang benar untuk secret ini, lalu coba lagi.',
  },
  router_not_found: {
    message: 'Router sudah dihapus.',
    action:
      'Daftarkan router lagi atau pulihkan profile secret secara manual di router. Tugas isolir sudah tidak relevan.',
  },
  router_not_ready: {
    message: 'Router belum siap isolir.',
    action: 'Jalankan ulang setup router (pratinjau lalu terapkan), lalu coba lagi.',
  },
  router_unverifiable: {
    message:
      'Tugas isolir sudah tidak diperlukan, tetapi router tidak dapat dibaca untuk memastikan profile isolir tidak tertinggal.',
    action:
      'Periksa profile secret di router secara manual. Jika masih profile isolir, kembalikan ke profile asal, atau perbaiki akses router lalu coba lagi.',
  },
  unreachable: {
    message: 'Router tidak terjangkau (sementara).',
    action:
      'Periksa jaringan/WireGuard, port API, dan firewall router. Sistem mengulang otomatis; coba lagi manual bila percobaan sudah habis.',
  },
  unknown: UNKNOWN_ERROR,
}

export function taskErrorAction(code: string): TaskErrorAction {
  return (Object.hasOwn(TASK_ERRORS, code) ? TASK_ERRORS[code] : undefined) ?? UNKNOWN_ERROR
}

interface ApiErrorBody {
  code?: string
  message?: string
  data?: { fingerprint?: string; pin_mismatch?: boolean }
  error?: { code?: string }
}

const SECRET_ACTION_ERRORS: Record<string, string> = {
  MIKROTIK_SECRET_HAS_ACTIVE_TASK:
    'Secret ini masih punya tugas isolir yang berjalan. Tunggu sampai selesai, lalu coba lagi.',
  MIKROTIK_SECRET_ISOLATED:
    'Secret ini sedang terisolir. Lepas pasangan setelah pelanggan lunas atau dikecualikan.',
  MIKROTIK_SECRET_ALREADY_PAIRED: 'Secret ini sudah terpasang ke pelanggan.',
  MIKROTIK_SECRET_NOT_FOUND: 'Secret tidak ditemukan. Impor ulang dari router.',
  MIKROTIK_SECRET_NOT_PAIRABLE: 'Secret belum bisa dipasangkan saat ini.',
  MIKROTIK_ACCOUNT_NOT_FOUND: 'Pelanggan tidak ditemukan atau sudah dihapus.',
  MIKROTIK_ANALYZE_IN_PROGRESS:
    'Analisis untuk router ini sedang berjalan. Coba lagi sebentar lagi.',
}

// Pesan yang bisa dibaca untuk galat aksi secret (pair/unpair/impor/analisis).
export function secretActionError(error: unknown): string {
  const body = (error as { response?: { data?: ApiErrorBody } } | undefined)?.response?.data
  const code = body?.code ?? body?.error?.code
  if (code && Object.hasOwn(SECRET_ACTION_ERRORS, code))
    return SECRET_ACTION_ERRORS[code] ?? 'Terjadi kesalahan, silakan coba lagi.'
  // Impor/analisis menyentuh router: kode router/probe punya padanan Indonesia di peta router.
  if (code && Object.hasOwn(ROUTER_ACTION_ERRORS, code))
    return ROUTER_ACTION_ERRORS[code] ?? 'Terjadi kesalahan, silakan coba lagi.'
  return body?.message || 'Terjadi kesalahan, silakan coba lagi.'
}

export function apiErrorCode(error: unknown): string | undefined {
  const body = (error as { response?: { data?: ApiErrorBody } } | undefined)?.response?.data
  return body?.code ?? body?.error?.code
}

const ROUTER_ACTION_ERRORS: Record<string, string> = {
  MIKROTIK_ROUTER_HAS_ISOLATED_SECRETS:
    'Router ini masih punya secret terisolir atau tugas isolir/pemulihan yang belum selesai. Selesaikan atau pulihkan dulu, lalu hapus lagi.',
  MIKROTIK_ROUTER_NAME_TAKEN: 'Nama router sudah dipakai. Gunakan nama lain.',
  MIKROTIK_SETUP_PLAN_CHANGED:
    'Rencana berubah sejak pratinjau (state router atau input berubah). Periksa pratinjau terbaru sebelum menerapkan.',
  MIKROTIK_SETUP_IN_PROGRESS:
    'Setup atau pembersihan lain sedang berjalan untuk router ini. Coba lagi setelah selesai.',
  MIKROTIK_ROUTER_NOT_FOUND: 'Router tidak ditemukan. Muat ulang halaman.',
  MIKROTIK_TLS_UNTRUSTED:
    'Sertifikat TLS router tidak dipercaya. Periksa sertifikat router atau atur fingerprint TLS.',
  MIKROTIK_TLS_REQUIRED: 'Router yang dapat dijangkau dari internet wajib memakai TLS.',
  MIKROTIK_HOST_NOT_ALLOWED:
    'Host router ditolak oleh kebijakan host. Gunakan alamat jaringan privat yang diizinkan.',
  MIKROTIK_AUTH_FAILED: 'Router menolak username/password. Periksa kredensial user API.',
  MIKROTIK_UNREACHABLE:
    'Router tidak terjangkau. Periksa jaringan/WireGuard, port API, dan firewall router.',
  MIKROTIK_SETUP_REST_UNVERIFIED:
    'Router ini memakai REST API yang belum terverifikasi untuk setup isolir. Gunakan API biner (port 8728/8729) atau hubungi admin platform.',
  MIKROTIK_SETUP_MARK_FAILED:
    'Setup tidak diterapkan karena status siap isolir gagal disimpan; router tidak diubah. Coba lagi.',
  MIKROTIK_SETUP_STATE_NOT_SAVED:
    'Setup sudah diterapkan di router, tetapi status tidak tersimpan. Jalankan Cek lalu terapkan ulang setup.',
  MIKROTIK_SETUP_FAILED:
    'Router menolak salah satu langkah setup. Status isolir belum ditandai siap; aman diulang. Bila terjadi saat pembersihan, pembersihan belum lengkap dan bisa diulang.',
  VALIDATION_ERROR: 'Data tidak valid. Periksa isian lalu coba lagi.',
  INTERNAL_ERROR: 'Terjadi kesalahan di server. Coba lagi nanti.',
  MIKROTIK_SETUP_CONFLICT:
    'Ada objek di router yang bentrok dengan setup. Jalankan Bersihkan lalu terapkan ulang, atau periksa urutan rule firewall.',
}

// Pesan yang bisa dibaca untuk galat aksi router (simpan/hapus/cek/setup).
export function routerActionError(error: unknown): string {
  const code = apiErrorCode(error)
  if (code && Object.hasOwn(ROUTER_ACTION_ERRORS, code))
    return ROUTER_ACTION_ERRORS[code] ?? 'Terjadi kesalahan, silakan coba lagi.'
  const body = (error as { response?: { data?: ApiErrorBody } } | undefined)?.response?.data
  return body?.message || 'Terjadi kesalahan, silakan coba lagi.'
}

// Sidik jari sertifikat yang dikembalikan backend untuk MIKROTIK_TLS_UNTRUSTED (response.data.data).
export function tlsUntrustedFingerprint(
  error: unknown,
): { fingerprint: string; pinMismatch: boolean } | null {
  const body = (error as { response?: { data?: ApiErrorBody } } | undefined)?.response?.data
  if (apiErrorCode(error) !== 'MIKROTIK_TLS_UNTRUSTED' || !body?.data?.fingerprint) return null
  return { fingerprint: body.data.fingerprint, pinMismatch: Boolean(body.data.pin_mismatch) }
}

const CHECK_STATUS_LABELS: Record<string, string> = {
  ok: 'Terhubung',
  unreachable: 'Tidak terjangkau',
  auth_failed: 'Kredensial ditolak',
  tls_untrusted: 'Sertifikat tidak dipercaya',
  host_not_allowed: 'Host ditolak',
}

// Nilai last_check_status dari backend; nilai tak dikenal ditampilkan apa adanya.
export function checkStatusLabel(status: string): string {
  return Object.hasOwn(CHECK_STATUS_LABELS, status)
    ? (CHECK_STATUS_LABELS[status] ?? status)
    : status
}
