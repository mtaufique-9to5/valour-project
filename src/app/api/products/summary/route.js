// GET /api/products/summary/?ids=1,2 — public, read-only. Current name, image,
// price and availability of PUBLISHED database products, for the cart. Draft,
// archived, deleted or unknown ids are simply absent from the answer.
import { getCartSummaries } from '@/server/catalog-v2/storefront'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('ids') ?? ''
  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => /^[1-9]\d{0,18}$/.test(s)))].slice(0, 50)
  const products = ids.length ? await getCartSummaries(ids) : {}
  return Response.json({ products }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
