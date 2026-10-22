// POST /api/admin/products/{id}/images — approved schema (rev. 2) implementation.
// The handler and its security checks live in src/server/catalog-v2/routes/product-images.js;
// segment config must stay in this file.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export { POST } from '@/server/catalog-v2/routes/product-images'
