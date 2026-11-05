/**
 * Serialisasi JSON-LD yang aman buat di-suntik ke <script>.
 *
 * JSON.stringify mentah TIDAK men-escape "<". Kalau ada string dari data
 * dinamis (nama game / label hero yang diedit admin) mengandung "</script>",
 * tag script bisa kebuka lebih awal → XSS. Solusi standar: escape semua
 * "<", ">", "&" jadi unicode escape — tetap JS valid dan tetap terbaca
 * normal oleh parser JSON-LD (Rich Results Test) Google.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
