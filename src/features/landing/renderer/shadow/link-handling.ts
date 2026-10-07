export type LinkAction =
  | { kind: 'hash'; id: string } // scroll di dalam shadow root
  | { kind: 'route'; path: string } // router.push (path + search + hash)
  | { kind: 'native' } // biarkan browser

export interface ClickInfo {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
}

const NATIVE: LinkAction = { kind: 'native' }

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/')
}

function decodeHashId(hash: string): string {
  const raw = hash.slice(1)
  try {
    return decodeURIComponent(raw)
  } catch {
    // Percent-encoding rusak: pakai apa adanya, sama seperti id mentah di DOM.
    return raw
  }
}

/**
 * Menentukan apa yang dilakukan renderer pada klik <a> di dalam shadow root.
 * Fungsi murni: klik yang butuh perilaku browser asli (tab baru, unduhan, origin
 * lain, API) selalu dikembalikan sebagai `native`, dan input tak valid tidak throw.
 */
export function classifyLinkClick(
  click: ClickInfo,
  href: string | null,
  target: string | null,
  hasDownload: boolean,
  currentUrl: string,
): LinkAction {
  if (click.defaultPrevented || click.button !== 0) return NATIVE
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return NATIVE
  if (hasDownload) return NATIVE
  if (target && target !== '_self') return NATIVE
  if (!href) return NATIVE

  let current: URL
  let url: URL
  try {
    current = new URL(currentUrl)
    url = new URL(href, current)
  } catch {
    return NATIVE
  }

  if (url.origin !== current.origin) return NATIVE
  if (isApiPath(url.pathname)) return NATIVE

  if (url.pathname === current.pathname && url.search === current.search) {
    if (url.hash.length > 1) return { kind: 'hash', id: decodeHashId(url.hash) }
    // "#" kosong atau link ke halaman yang sama tanpa hash: biarkan browser.
    return NATIVE
  }

  return { kind: 'route', path: url.pathname + url.search + url.hash }
}

const CATCH_ALL_PATH = '/:pathMatch(.*)*' // route `not-found` di src/app/router.ts

/**
 * True bila hasil `router.resolve(...).matched` adalah route aplikasi sungguhan.
 * Path tanpa route (mis. /media/x.pdf) atau yang jatuh ke catch-all dibiarkan native.
 */
export function hasAppRoute(matched: ReadonlyArray<{ path: string }>): boolean {
  return matched.length > 0 && !matched.some((m) => m.path === CATCH_ALL_PATH)
}
