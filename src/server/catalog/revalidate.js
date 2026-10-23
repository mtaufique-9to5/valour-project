// Invalidate every admin page after a catalog change. Storefront product pages
// read the database on every request (dynamic), so they need no invalidation.
import 'server-only'
import { revalidatePath } from 'next/cache'

export function revalidateCatalog() {
  revalidatePath('/admin', 'layout')
}
