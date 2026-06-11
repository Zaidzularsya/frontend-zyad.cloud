<template>
  <div class="mx-auto max-w-xl py-24 text-center">
    <p class="text-sm font-bold text-brand-600">403</p>
    <h1 class="mt-3 text-3xl font-bold">Akses tidak tersedia</h1>
    <p class="mt-3 text-gray-500">Role Anda tidak memiliki permission untuk membuka halaman ini.</p>
    <RouterLink :to="{ name: 'dashboard' }" class="mt-6 inline-block font-semibold text-brand-600">
      Kembali ke dashboard
    </RouterLink>
  </div>
</template>
