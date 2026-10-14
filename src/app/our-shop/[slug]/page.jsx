
import ProductView from "./ProductView";

const slugs = [
  "sunseeker-yellow",
  "astral-blue",
  "aurora-mint",
  "nova-red",
  "frost-silver",
  "eclipse-black",
];

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