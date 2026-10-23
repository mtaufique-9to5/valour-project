import { notFound } from "next/navigation";
import { getRelatedStorefrontProducts, getStorefrontProduct } from "@/server/catalog-v2/storefront";
import ProductView from "./ProductView";

// Watches and straps by slug: published database products and the static
// catalog (see storefront.js for the merge rule). Read on every request, so admin
// edits appear on the next load; drafts, archived and unknown slugs are a 404.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  return { title: product ? `${product.name} | Valour` : "Valour" };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (!product) notFound();
  const related = await getRelatedStorefrontProducts(product);
  return <ProductView product={product} related={related} />;
}
