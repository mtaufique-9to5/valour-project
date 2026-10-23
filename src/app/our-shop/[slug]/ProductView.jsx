"use client";
import ProductDetail from "@/components/product/ProductDetail";

// Renders a product resolved on the server (database or static catalog);
// ProductDetail picks the watch or strap layout.
export default function ProductView({ product, related }) {
  return <ProductDetail product={product} related={related} />;
}
