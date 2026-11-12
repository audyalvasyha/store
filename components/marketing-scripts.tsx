import Script from "next/script"

/**
 * Script marketing opsional. Semua ID divalidasi dulu; kalau env kosong,
 * tidak ada script yang dimuat sama sekali. Ini bikin preview/dev tetap
 * ringan dan production bisa diaktifkan cuma dengan menambah env.
 */
export function MarketingScripts() {
  const gaId = /^G-[A-Z0-9]{4,20}$/i.test(
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? ""
  )
    ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!.trim()
    : ""
  const clarityId = /^[a-z0-9]{6,32}$/i.test(
    process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? ""
  )
    ? process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID!.trim()
    : ""
  const metaPixelId = /^\d{5,20}$/.test(
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? ""
  )
    ? process.env.NEXT_PUBLIC_META_PIXEL_ID!.trim()
    : ""
  const tiktokPixelId = /^[A-Z0-9]{10,32}$/i.test(
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() ?? ""
  )
    ? process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID!.trim()
    : ""

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}

      {clarityId ? (
        <Script
          src={`https://www.clarity.ms/tag/${clarityId}`}
          strategy="afterInteractive"
        />
      ) : null}

      {metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {tiktokPixelId ? (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load("${tiktokPixelId}");ttq.page();}(window,document,"ttq");`}
        </Script>
      ) : null}
    </>
  )
}
