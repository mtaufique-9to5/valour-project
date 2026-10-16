'use client'
import { useAddToCart } from '@/app/features/cart/useCartActions'

// Adds one of `product` through the shared cart hook, so feedback (sidebar +
// notice), the double-click guard and the quantity limit are the cart's own.
// data-opens-cart stops the sidebar's click-outside handler closing it first.
export default function AddToCartButton({ product, className, children = 'Add to Cart', ...rest }) {
  const addToCart = useAddToCart()
  return (
    <button
      type="button"
      className={className}
      data-opens-cart
      onClick={() => addToCart({ kind: product.type, productId: product.productId })}
      {...rest}
    >
      {children}
    </button>
  )
}
