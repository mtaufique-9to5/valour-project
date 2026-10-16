import { getProductBySlug, products } from "@/data/catalog";
import ProductView from "./ProductView";

// One page per catalog product (watches and straps). Only these exist; any
// other slug is a 404 (required with output: 'export'). Duplicate slugs can't
// reach this point: the catalog throws when it loads.
export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return { title: product ? `${product.name} | Valour` : "Valour" };
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <ProductView slug={slug} />;
}
