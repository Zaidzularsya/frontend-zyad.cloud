import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * Mengaktifkan animasi reveal untuk semua elemen `.fade-up` di dalam root:
 * class `visible` ditambahkan saat elemen masuk viewport (sekali saja).
 * Elemen yang dirender belakangan (async section) tetap tertangkap lewat
 * MutationObserver.
 */
export function useScrollReveal(root: Ref<HTMLElement | null>) {
  let intersectionObserver: IntersectionObserver | null = null
  let mutationObserver: MutationObserver | null = null

  function observeAll(container: HTMLElement) {
    container.querySelectorAll<HTMLElement>('.fade-up:not(.visible)').forEach((element) => {
      intersectionObserver?.observe(element)
    })
  }

  onMounted(() => {
    const container = root.value
    if (!container) return

    if (typeof IntersectionObserver === 'undefined') {
      container.querySelectorAll('.fade-up').forEach((element) => element.classList.add('visible'))
      return
    }

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('visible')
          intersectionObserver?.unobserve(entry.target)
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )

    observeAll(container)

    mutationObserver = new MutationObserver(() => observeAll(container))
    mutationObserver.observe(container, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    intersectionObserver?.disconnect()
    mutationObserver?.disconnect()
  })
}
