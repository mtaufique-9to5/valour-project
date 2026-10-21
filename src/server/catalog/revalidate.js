// Invalidate every admin page after a catalog change (storefront still reads
// src/data/catalog.js, so it is unaffected).
import 'server-only'
import { revalidatePath } from 'next/cache'

export function revalidateCatalog() {
  revalidatePath('/admin', 'layout')
}
