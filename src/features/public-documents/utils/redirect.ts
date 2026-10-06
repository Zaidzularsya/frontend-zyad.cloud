/** Dibungkus agar bisa di-mock di unit test (window.location.assign tidak bisa di-stub di jsdom). */
export function redirectTo(url: string): void {
  window.location.assign(url)
}
