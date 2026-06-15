<template>
  <div class="grid min-h-screen place-items-center p-6 text-center">
    <div>
      <p class="text-sm font-bold text-brand-600">404</p>
      <h1 class="mt-3 text-3xl font-bold">Halaman tidak ditemukan</h1>
      <RouterLink :to="{ name: 'profile' }" class="mt-6 inline-block font-semibold text-brand-600">
        Kembali ke profile
      </RouterLink>
    </div>
  </div>
</template>
