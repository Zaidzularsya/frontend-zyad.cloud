@AGENTS.md

## Claude Code — catatan tambahan

- Gunakan Plan mode untuk perubahan yang menyentuh alur auth/tenant guard (`src/middleware`) atau kontrak API (`*.api.ts`) — perubahan di area ini gampang berdampak lintas fitur.
- Jangan asumsikan endpoint backend ada hanya karena "masuk akal" secara desain — backend berada di repo terpisah (`../backend`), verifikasi dulu lewat `api/openapi.yaml` di repo backend sebelum menulis API client baru.
- `.env` (bukan hanya `.env.example`) sudah ada di working tree tapi tidak ter-track git — jangan pernah membaca atau menampilkan isinya di percakapan, dan jangan menimpanya tanpa konfirmasi eksplisit.
