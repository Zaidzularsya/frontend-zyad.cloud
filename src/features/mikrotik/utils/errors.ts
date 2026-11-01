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
