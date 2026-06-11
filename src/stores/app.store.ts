import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(false)
  const darkMode = ref(localStorage.getItem('zyad.theme') === 'dark')

  watch(
    darkMode,
    (enabled) => {
      document.documentElement.classList.toggle('dark', enabled)
      localStorage.setItem('zyad.theme', enabled ? 'dark' : 'light')
    },
    { immediate: true },
  )

  return { sidebarOpen, darkMode }
})
