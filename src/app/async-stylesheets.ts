/**
 * Stylesheet `<link media="print" data-async-stylesheet>` di index.html diunduh tanpa
 * memblokir render; setelah termuat media diubah ke "all". Bila origin-nya tidak
 * terjangkau (sesi isolir), link tetap "print" dan halaman tampil dengan font sistem.
 */
export function activateAsyncStylesheets(root: ParentNode = document): void {
  root.querySelectorAll<HTMLLinkElement>('link[data-async-stylesheet]').forEach((link) => {
    const activate = () => {
      link.media = 'all'
    }
    if (link.sheet) activate()
    else link.addEventListener('load', activate, { once: true })
  })
}
