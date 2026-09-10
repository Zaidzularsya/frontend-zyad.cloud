<script setup lang="ts">
import GrapesEditor from '@/features/landing/builder/grapes/GrapesEditor.vue'

/**
 * TEMPORARY evaluation route (`/landing-grapes-sandbox`). Lets us try the real
 * GrapesJS UX on the dev server before wiring storage/publish. Removed once the
 * builder integration (`LandingContentPage.vue`) lands.
 */
const STARTER = {
  html: `
    <section style="padding:72px 24px;background:#0f172a;color:#fff;text-align:center">
      <div style="max-width:760px;margin:0 auto">
        <h1 style="font-size:44px;font-weight:800;margin:0 0 16px">Judul halaman</h1>
        <p style="font-size:18px;opacity:.85;margin:0 0 24px">
          Seret blok dari panel kiri, atur gaya di panel kanan, ganti device di bar atas.
        </p>
        <a href="#" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none">Mulai</a>
      </div>
    </section>
    <section style="padding:56px 24px">
      <div style="max-width:1120px;margin:0 auto;display:flex;gap:24px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <h3 style="font-size:20px;font-weight:700;margin:0 0 8px">Kolom satu</h3>
          <p style="margin:0;color:#475569">Contoh isi kolom. Klik untuk pilih, klik dua kali untuk edit teks.</p>
        </div>
        <div style="flex:1;min-width:220px">
          <h3 style="font-size:20px;font-weight:700;margin:0 0 8px">Kolom dua</h3>
          <p style="margin:0;color:#475569">Blok bisa disarangkan ke dalam Section / Container.</p>
        </div>
      </div>
    </section>`,
  css: '',
}
</script>

<template>
  <GrapesEditor :initial="STARTER" />
</template>
