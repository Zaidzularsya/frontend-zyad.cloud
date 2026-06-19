<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

interface MarketingNavItem {
  id?: string
  label: string
  href: string
  target?: string
  children?: MarketingNavItem[]
}

const isOpen = ref(false)
const isDark = ref(false)
const navigationItems = ref<MarketingNavItem[]>([])

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = savedTheme === 'dark' || (!savedTheme && prefersDark)

  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

watch(isDark, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
})

const toggleTheme = () => {
  isDark.value = !isDark.value
}

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const fallbackLinks: MarketingNavItem[] = [
  { label: 'Solusi', href: '#solusi' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Demo', href: '#demo-portal' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Partner Program', href: '#benefits' },
]

const setNavigation = (items: MarketingNavItem[]) => {
  navigationItems.value = items
}

const links = () => (navigationItems.value.length > 0 ? navigationItems.value : fallbackLinks)
</script>

<template>
  <div
    class="min-h-screen bg-surface text-on-surface selection:bg-secondary-fixed selection:text-on-secondary-fixed"
  >
    <nav
      class="bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-xl border-b border-outline-variant/30 dark:border-outline/20 shadow-sm fixed top-0 w-full z-50 transition-all duration-300"
    >
      <div class="flex justify-between items-center max-w-7xl mx-auto px-4 md:px-8 py-4">
        <a
          class="font-headline-md text-xl font-bold text-primary dark:text-primary-fixed tracking-tight"
          href="#"
        >
          HEY Digital Solution
        </a>

        <!-- Desktop Menu -->
        <div class="hidden md:flex items-center gap-8">
          <a
            v-for="(link, idx) in links()"
            :key="idx"
            class="transition-colors font-label-sm text-sm text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed"
            :href="link.href"
            :target="link.target === 'new_tab' ? '_blank' : undefined"
            :rel="link.target === 'new_tab' ? 'noopener noreferrer' : undefined"
          >
            {{ link.label }}
          </a>
        </div>

        <!-- Desktop CTA & Theme Toggle -->
        <div class="hidden md:flex items-center gap-4">
          <button
            class="p-2.5 rounded-full hover:bg-outline-variant/10 text-on-surface-variant dark:text-surface-variant transition-colors cursor-pointer"
            :title="isDark ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'"
            @click="toggleTheme"
          >
            <span class="material-symbols-outlined flex items-center justify-center text-xl">
              {{ isDark ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>

          <RouterLink :to="{ name: 'login' }">
            <BaseButton class="shadow-md shadow-secondary/15"> Login Partner </BaseButton>
          </RouterLink>
        </div>

        <!-- Mobile Toggle Buttons -->
        <div class="flex items-center gap-2 md:hidden">
          <button
            class="p-2 rounded-full hover:bg-outline-variant/10 text-on-surface-variant dark:text-surface-variant transition-colors"
            @click="toggleTheme"
          >
            <span class="material-symbols-outlined flex items-center justify-center text-xl">
              {{ isDark ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>

          <button class="text-on-surface p-2 focus:outline-none" @click="toggleMenu">
            <span class="material-symbols-outlined flex items-center justify-center text-xl">
              {{ isOpen ? 'close' : 'menu' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Mobile Menu Overlay -->
      <div
        v-if="isOpen"
        class="md:hidden bg-surface dark:bg-surface-dim border-b border-outline-variant/30 dark:border-outline/20 py-4 px-4 flex flex-col gap-4 animate-fade-in"
      >
        <a
          v-for="(link, idx) in links()"
          :key="idx"
          class="py-2 border-b border-outline-variant/10 font-label-sm text-sm text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed"
          :href="link.href"
          :target="link.target === 'new_tab' ? '_blank' : undefined"
          :rel="link.target === 'new_tab' ? 'noopener noreferrer' : undefined"
          @click="isOpen = false"
        >
          {{ link.label }}
        </a>

        <RouterLink :to="{ name: 'login' }" class="mt-2 text-center" @click="isOpen = false">
          <BaseButton class="w-full shadow-md shadow-secondary/15"> Login Partner </BaseButton>
        </RouterLink>
      </div>
    </nav>

    <main>
      <RouterView @landing-navigation="setNavigation" />
    </main>

    <footer
      class="border-t border-outline-variant/30 bg-surface-container-low py-12 dark:bg-surface-dim"
    >
      <div class="mx-auto max-w-7xl px-6 text-center text-sm text-on-surface-variant">
        <p>&copy; 2026 Zyad Cloud Platform. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
