<script setup lang="ts">
import BrandLogo from '@/features/branding/components/BrandLogo.vue'
import BrandParticles from '@/features/branding/components/BrandParticles.vue'
</script>

<template>
  <main class="grid min-h-screen lg:grid-cols-2">
    <section class="flex items-center justify-center bg-white p-6 dark:bg-gray-950">
      <RouterView />
    </section>
    <aside
      class="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between"
    >
      <BrandParticles class="absolute inset-0" />
      <div class="absolute -right-32 -top-32 size-96 rounded-full bg-brand-500/30 blur-3xl" />
      <div class="relative flex items-center gap-3">
        <BrandLogo variant="dark" class="h-10" />
        <strong class="text-xl">Zyad Cloud</strong>
      </div>
      <div class="relative max-w-lg">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-100">SaaS CRM</p>
        <h1 class="mt-4 text-4xl font-bold leading-tight">
          Satu workspace untuk customer, tim, dan pertumbuhan bisnis.
        </h1>
        <p class="mt-5 text-gray-300">
          Dibangun untuk organisasi multi-tenant dengan kontrol akses yang jelas dan data yang tetap
          terisolasi.
        </p>
      </div>
      <p class="relative text-sm text-gray-400">zyad.cloud</p>
    </aside>
  </main>
</template>
