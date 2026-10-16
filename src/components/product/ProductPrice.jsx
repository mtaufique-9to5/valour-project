import { formatPrice } from '@/app/features/cart/cartFormat'
import { getProductPrice } from '@/data/catalog'

// "$45.00" or "Price on request" — always from CONFIRMED_PRICES via the catalog.
export const getPriceLabel = (product) => formatPrice(getProductPrice(product))

export default function ProductPrice({ product, className }) {
  return <p className={className}>{getPriceLabel(product)}</p>
}
