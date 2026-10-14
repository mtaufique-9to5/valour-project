
import ProductView from "./ProductView";

const slugs = [
  "sunseeker-yellow",
  "astral-blue",
  "aurora-mint",
  "nova-red",
  "frost-silver",
  "eclipse-black",
];

// Only the slugs above exist; anything else renders not-found.jsx instead of
// failing static path generation (required behaviour with output: 'export').
export const dynamicParams = false;

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

// export default async function Page({ params }) {
//   const { slug } = await params;
//   return <ProductView slug={slug} />;
// }


export default async function Page({ params }) {
  const { slug } = await params;
  return <ProductView slug={slug} />;
}