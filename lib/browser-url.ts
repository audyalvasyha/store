/**
 * Ganti URL di address bar tanpa memicu navigasi/restore router Next.js.
 *
 * Next.js mem-patch `window.history.replaceState` supaya perubahan URL ikut
 * masuk ke router. Di Next 16.4, restore untuk perubahan query di halaman ISR
 * bisa men-suspend layout router lalu memunculkan warning React
 * "conditional use of use". Panggil method native di prototype supaya filter
 * lokal tetap bisa di-refresh/dibagikan tanpa request RSC per ketikan.
 */
export function replaceLocalUrl(url: string) {
  if (typeof window === "undefined") return
  History.prototype.replaceState.call(window.history, null, "", url)
}
