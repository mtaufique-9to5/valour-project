import { getStrapBySlug, straps } from "@/data/catalog";
import StrapView from "./StrapView";

// Legacy strap addresses. Straps now live at /our-shop/{slug}/; these six
// pages only forward old links and bookmarks there (static-export friendly).
export const dynamicParams = false;

export function generateStaticParams() {
  return straps.map((strap) => ({ slug: strap.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const strap = getStrapBySlug(slug);
  return {
    title: strap ? `${strap.name} | Valour` : "Valour",
    // Keep search engines on the canonical /our-shop/ page.
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <StrapView slug={slug} />;
}
