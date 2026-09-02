<script setup lang="ts">
import LegalPageShell from '../components/LegalPageShell.vue'
</script>

<template>
  <LegalPageShell title="Kebijakan Refund" updated-at="11 Juli 2026" doc-version="1.0">
    <p>
      Kebijakan Refund ini berlaku untuk seluruh pembelian langganan berbayar pada platform Zyad
      Cloud yang dioperasikan oleh <strong>PT Zyad Technovation Indonesia</strong> dan merupakan
      ringkasan operasional dari Bab 8 (Kebijakan Refund dan Pembatalan)
      <RouterLink to="/legal/terms" class="text-primary underline"
        >Syarat &amp; Ketentuan</RouterLink
      >
      layanan kami.
    </p>

    <h2>1. Prinsip Umum</h2>
    <ul>
      <li>
        Pembayaran langganan diproses melalui payment gateway resmi, termasuk DOKU, dan tercatat
        pada invoice Anda.
      </li>
      <li>
        Kecuali dinyatakan lain dalam penawaran resmi, biaya layanan yang telah dibayarkan bersifat
        <strong>tidak dapat dikembalikan</strong> apabila layanan telah aktif atau telah digunakan.
      </li>
      <li>Paket gratis tidak melibatkan pembayaran sehingga tidak memiliki komponen refund.</li>
      <li>
        Refund yang disetujui dikembalikan ke metode pembayaran asal, mengikuti mekanisme dan waktu
        proses payment gateway serta bank/penerbit terkait.
      </li>
    </ul>

    <h2>2. Kondisi yang Dapat Dipertimbangkan untuk Refund</h2>
    <p>
      Zyad Cloud dapat mempertimbangkan pengembalian dana secara kasus per kasus apabila terjadi:
    </p>
    <ul>
      <li><strong>Pembayaran ganda</strong> untuk invoice yang sama;</li>
      <li><strong>Kesalahan nominal</strong> yang terverifikasi;</li>
      <li>
        <strong>Kegagalan aktivasi</strong> layanan yang disebabkan oleh kesalahan sistem Zyad
        Cloud;
      </li>
      <li>kondisi lain yang secara wajar dianggap layak untuk diproses.</li>
    </ul>

    <h2>3. Kondisi yang Tidak Memenuhi Syarat</h2>
    <ul>
      <li>Layanan telah aktif dan digunakan secara normal.</li>
      <li>Permintaan tidak memenuhi ketentuan atau data tidak valid.</li>
      <li>Terdapat indikasi penyalahgunaan layanan atau mekanisme refund.</li>
      <li>
        Sisa periode langganan setelah pembatalan (langganan tetap aktif hingga akhir periode).
      </li>
      <li>
        Akun yang ditangguhkan karena pelanggaran
        <RouterLink to="/legal/terms" class="text-primary underline"
          >Syarat &amp; Ketentuan</RouterLink
        >
        atau
        <RouterLink to="/legal/aup" class="text-primary underline">Acceptable Use Policy</RouterLink
        >.
      </li>
    </ul>

    <h2>4. Potongan Biaya</h2>
    <p>
      Biaya administrasi, biaya payment gateway, biaya bank, atau biaya pihak ketiga lain dapat
      dipotong dari nilai refund apabila berlaku dan diperbolehkan oleh ketentuan yang relevan.
    </p>

    <h2>5. Cara Mengajukan Refund</h2>
    <ol>
      <li>
        Kirim permohonan ke
        <a href="mailto:yulianto.personal@outlook.com" class="text-primary underline"
          >yulianto.personal@outlook.com</a
        >
        dengan subjek "Permohonan Refund".
      </li>
      <li>
        Sertakan bukti pembayaran, identitas akun, nomor invoice, tanggal transaksi, nominal, dan
        alasan permintaan.
      </li>
      <li>Tim kami memverifikasi dan memberi keputusan maksimal 7 hari kerja.</li>
      <li>
        Refund yang disetujui diproses maksimal 14 hari kerja; waktu tiba dana mengikuti
        bank/penerbit Anda.
      </li>
    </ol>

    <h2>6. Kontak</h2>
    <p>
      Pertanyaan mengenai kebijakan ini dapat disampaikan ke
      <a href="mailto:yulianto.personal@outlook.com" class="text-primary underline"
        >yulianto.personal@outlook.com</a
      >. Alamat merchant: Desa Lumpang, Kec. Karanganyar, Kab. Purbalingga, Jawa Tengah.
    </p>
  </LegalPageShell>
</template>
