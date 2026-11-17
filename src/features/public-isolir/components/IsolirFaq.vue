<script setup lang="ts">
const items = [
  {
    q: 'Kenapa internet dijeda?',
    a: 'Layanan dijeda sementara karena ada tagihan yang belum dibayar. Setelah tagihan lunas, layanan dipulihkan.',
  },
  {
    q: 'Berapa lama setelah bayar?',
    a: 'Umumnya layanan aktif kembali dalam beberapa menit setelah pembayaran kami terima. Bila lebih dari itu, hubungi kami.',
  },
  {
    q: 'Bisa bayar dari HP lain?',
    a: 'Bisa. Tautan pembayaran tidak terikat pada perangkat; cukup cari tagihan Anda lalu bayar dari perangkat mana pun.',
  },
  {
    q: 'Data saya aman?',
    a: 'Kami hanya menampilkan nama yang disamarkan dan daftar tagihan. Data pribadi lengkap tidak ditampilkan di halaman ini.',
  },
]
</script>

<template>
  <section>
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Pertanyaan umum</h2>
    <div class="mt-3 grid gap-2">
      <details
        v-for="item in items"
        :key="item.q"
        class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      >
        <summary
          class="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          {{ item.q }}
        </summary>
        <p class="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400">{{ item.a }}</p>
      </details>
    </div>
  </section>
</template>
