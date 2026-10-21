// Serves uploaded product images from private storage.
// Only "/media/products/<productId>/<32 hex>.(jpg|png|webp)" is accepted; any
// other path (traversal, encoded separators, other extensions) is a plain 404.
// File names are random and immutable, so responses are cached for a year.
import { parseMediaPath } from '@/server/catalog/image-rules.js'
import { readProductImage } from '@/server/catalog/storage.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
  })

export async function GET(_request, { params }) {
  const { path: segments } = await params
  const parsed = parseMediaPath(segments)
  if (!parsed) return notFound()
  const bytes = await readProductImage(parsed.storageKey)
  if (!bytes) return notFound()
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': parsed.mime,
      'Content-Length': String(bytes.length),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
