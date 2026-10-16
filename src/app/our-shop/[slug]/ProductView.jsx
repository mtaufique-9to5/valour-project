"use client";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product/ProductDetail";
import { getProductBySlug } from "@/data/catalog";

// Resolves any product (watch or strap) from the unified catalog; ProductDetail
// picks the layout from product.type.
export default function ProductView({ slug }) {
  const product = getProductBySlug(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
