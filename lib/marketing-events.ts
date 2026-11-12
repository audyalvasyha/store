/**
 * Event marketing lintas platform. Semua call aman kalau script analytics
 * belum dipasang / diblokir — ga ada dependency baru, cuma optional chaining.
 */
type Item = {
  id?: string
  name: string
  price: number
  quantity?: number
}

type CheckoutEvent = {
  value: number
  item: Item
  coupon?: string | null
}

type PurchaseEvent = {
  transactionId: string
  value: number
  item: Item
}

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void
  fbq?: (...args: unknown[]) => void
  ttq?: {
    track?: (event: string, params?: Record<string, unknown>) => void
  }
}

function analyticsWindow(): AnalyticsWindow | null {
  return typeof window === "undefined" ? null : (window as AnalyticsWindow)
}

function cleanAmount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

function contents(item: Item) {
  return [
    {
      content_id: item.id ?? item.name,
      content_name: item.name,
      content_type: "product",
      quantity: item.quantity ?? 1,
      price: cleanAmount(item.price),
    },
  ]
}

export function trackBeginCheckout({ value, item, coupon }: CheckoutEvent): void {
  const w = analyticsWindow()
  if (!w) return

  const amount = cleanAmount(value)
  const quantity = item.quantity ?? 1

  w.gtag?.("event", "begin_checkout", {
    currency: "IDR",
    value: amount,
    coupon: coupon ?? undefined,
    items: [
      {
        item_id: item.id ?? item.name,
        item_name: item.name,
        price: cleanAmount(item.price),
        quantity,
      },
    ],
  })

  w.fbq?.("track", "InitiateCheckout", {
    value: amount,
    currency: "IDR",
    content_name: item.name,
    content_type: "product",
    contents: contents({ ...item, quantity }),
    num_items: quantity,
  })

  w.ttq?.track?.("InitiateCheckout", {
    value: amount,
    currency: "IDR",
    contents: contents({ ...item, quantity }),
  })
}

export function trackPurchase({ transactionId, value, item }: PurchaseEvent): void {
  const w = analyticsWindow()
  if (!w) return

  const amount = cleanAmount(value)
  const quantity = item.quantity ?? 1

  w.gtag?.("event", "purchase", {
    transaction_id: transactionId,
    currency: "IDR",
    value: amount,
    items: [
      {
        item_id: item.id ?? item.name,
        item_name: item.name,
        price: cleanAmount(item.price),
        quantity,
      },
    ],
  })

  w.fbq?.("track", "Purchase", {
    value: amount,
    currency: "IDR",
    content_name: item.name,
    content_type: "product",
    contents: contents({ ...item, quantity }),
    num_items: quantity,
  })

  w.ttq?.track?.("CompletePayment", {
    value: amount,
    currency: "IDR",
    contents: contents({ ...item, quantity }),
  })
}
