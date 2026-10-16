"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getProductHref } from "@/app/features/product/productUrl";
import { getStrapBySlug } from "@/data/catalog";

// Redirects a legacy /straps/{slug}/ address to the strap's product page. The
// target is never a /straps/ URL, so there is no loop.
export default function StrapView({ slug }) {
  const router = useRouter();
  const strap = getStrapBySlug(slug);
  const target = strap ? getProductHref(strap) : "/our-shop/";

  useEffect(() => {
    router.replace(target);
  }, [router, target]);

  // Relative URLs (from /straps/{slug}/) so they also respect a basePath.
  const relative = `../..${target}`;
  return (
    <>
      {/* Works without JavaScript. */}
      <meta httpEquiv="refresh" content={`0;url=${relative}`} />
      <link rel="canonical" href={relative} />
      <p style={{ padding: 40, color: "#fff" }}>
        This page has moved.{" "}
        <Link href={target}>Continue to {strap ? strap.name : "the shop"}</Link>
      </p>
    </>
  );
}
