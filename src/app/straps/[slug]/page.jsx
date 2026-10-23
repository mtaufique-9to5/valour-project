import { notFound, permanentRedirect } from "next/navigation";
import { getStorefrontProduct } from "@/server/catalog-v2/storefront";

// Legacy strap addresses. Every strap lives at /our-shop/{slug}/. The six static
// straps are redirected by next.config.mjs before this page runs; published
// database straps are forwarded here. Anything else is a 404.
export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (product?.type !== "strap") notFound();
  permanentRedirect(`/our-shop/${product.slug}/`);
}
