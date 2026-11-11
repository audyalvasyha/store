"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

/** Cuma terima foto kustom (JPEG/PNG/WebP) atau foto Google (HTTPS). */
function safeAvatarSrc(src?: string | null): string | undefined {
  if (typeof src !== "string" || !src) return undefined
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(src)) return src
  if (src.startsWith("https://")) return src
  return undefined
}

export function UserAvatar({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string | null
  name?: string | null
  className?: string
  fallbackClassName?: string
}) {
  const label = (typeof name === "string" ? name.trim() : "") || "Pembeli Gastros"
  const initial = label[0]?.toUpperCase() ?? "G"
  const safeSrc = safeAvatarSrc(src)

  return (
    <Avatar className={cn("rounded-none border border-border", className)}>
      {safeSrc ? (
        <AvatarImage
          src={safeSrc}
          alt={`Foto ${label}`}
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "rounded-none bg-accent font-sans text-2xl leading-none text-accent-foreground",
          fallbackClassName
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
