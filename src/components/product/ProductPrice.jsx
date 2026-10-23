import { formatPrice } from '@/app/features/cart/cartFormat'

// The price the server read from `products` for this page load (sale price when
// set). The cart and checkout re-read prices themselves.
export const unitPriceOf = (product) => product?.price ?? null

export const getPriceLabel = (product) => formatPrice(unitPriceOf(product))

// "$1,099.00" with the base price struck through before it when on sale.
export function PriceLabel({ product }) {
  const was = product?.compareAtPrice
  return (
    <span>
      {was != null && <><s className="price-was">{formatPrice(was)}</s>{' '}</>}
      {getPriceLabel(product)}
    </span>
  )
}

export default function ProductPrice({ product, className }) {
  return <p className={className}><PriceLabel product={product} /></p>
}
