<script setup lang="ts">
import LegalPageShell from '../components/LegalPageShell.vue'
</script>

<template>
  <LegalPageShell title="Kebijakan Refund" updated-at="9 Juli 2026">
    <p>
      Kebijakan Refund ini berlaku untuk seluruh pembelian langganan berbayar pada platform Zyad
      Cloud yang dioperasikan oleh
      <strong>[ISI SESUAI DATA BISNIS ANDA — nama badan hukum]</strong> dan merupakan bagian dari
      <RouterLink to="/legal/terms" class="text-primary underline"
        >Syarat &amp; Ketentuan</RouterLink
      >
      layanan kami.
    </p>

    <h2>1. Prinsip Umum</h2>
    <ul>
      <li>
        Pembayaran langganan diproses melalui payment gateway DOKU dan tercatat pada invoice Anda.
      </li>
      <li>Paket gratis tidak melibatkan pembayaran sehingga tidak memiliki komponen refund.</li>
      <li>
        Refund diberikan ke metode pembayaran asal, mengikuti mekanisme dan waktu proses DOKU serta
        bank/penerbit terkait.
      </li>
    </ul>

    <h2>2. Kondisi yang Memenuhi Syarat Refund</h2>
    <ul>
      <li>
        <strong>Pembayaran ganda</strong> untuk invoice yang sama — kelebihan bayar dikembalikan
        penuh.
      </li>
      <li>
        <strong>Layanan tidak teraktivasi</strong>: pembayaran sukses namun upgrade paket tidak
        aktif dalam 2×24 jam dan tim kami tidak dapat memulihkannya.
      </li>
      <li>
        <strong>Gangguan layanan berkepanjangan</strong>: ketidaktersediaan Layanan lebih dari
        <strong>[ISI SESUAI DATA BISNIS ANDA — ambang SLA, mis. 72 jam]</strong> berturut-turut yang
        disebabkan oleh Kami, dihitung prorata.
      </li>
      <li>
        <strong>Pembatalan dini dalam masa garansi</strong>: pengajuan dalam
        <strong>[ISI SESUAI DATA BISNIS ANDA — masa garansi, mis. 7 hari]</strong> sejak pembayaran
        pertama paket berbayar, dikembalikan penuh dikurangi biaya pemrosesan payment gateway (jika
        ada).
      </li>
    </ul>

    <h2>3. Kondisi yang Tidak Memenuhi Syarat</h2>
    <ul>
      <li>Perubahan pikiran setelah masa garansi berakhir.</li>
      <li>
        Sisa periode langganan setelah pembatalan (langganan tetap aktif hingga akhir periode).
      </li>
      <li>Akun yang ditangguhkan karena pelanggaran Syarat &amp; Ketentuan.</li>
      <li>Biaya yang dikenakan pihak ketiga di luar kendali Kami.</li>
    </ul>

    <h2>4. Cara Mengajukan Refund</h2>
    <ol>
      <li>
        Kirim permohonan ke <strong>[ISI SESUAI DATA BISNIS ANDA — email kontak]</strong> dengan
        subjek "Permohonan Refund".
      </li>
      <li>Sertakan nomor invoice, tanggal pembayaran, nominal, dan alasan pengajuan.</li>
      <li>Tim kami memverifikasi dan memberi keputusan maksimal 7 hari kerja.</li>
      <li>
        Refund yang disetujui diproses maksimal 14 hari kerja; waktu tiba dana mengikuti
        bank/penerbit Anda.
      </li>
    </ol>

    <h2>5. Kontak</h2>
    <p>
      Pertanyaan mengenai kebijakan ini dapat disampaikan ke
      <strong>[ISI SESUAI DATA BISNIS ANDA — email kontak]</strong> atau
      <strong>[ISI SESUAI DATA BISNIS ANDA — nomor telepon]</strong> pada jam kerja
      <strong>[ISI SESUAI DATA BISNIS ANDA — jam operasional]</strong>.
    </p>
  </LegalPageShell>
</template>
