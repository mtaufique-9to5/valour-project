import HomeClient from './HomeClient'
import { listStorefrontProducts } from '@/server/catalog-v2/storefront'

// Read on every request so the watch carousel shows newly published database
// watches (and stops showing archived ones) on the next load.
export const dynamic = 'force-dynamic'

export default async function Home() {
  return <HomeClient watches={await listStorefrontProducts('watch')} />
}
