import { getEventImage } from "@/lib/event-carousel-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Sajikan gambar event dari MongoDB. URL memakai ID acak dan tidak pernah
 * berubah isinya, jadi aman di-cache immutable setahun.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const image = await getEventImage(id)
  if (!image) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
    },
  })
}
