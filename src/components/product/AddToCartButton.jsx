'use client'

import { useAddToCart } from '@/app/features/cart/useCartActions'

// Adds one of `product` through the shared cart hook, so feedback (sidebar +
// notice), the double-click guard and the quantity limit are the cart's own.
// data-opens-cart stops the sidebar's click-outside handler closing it first.
// Database products use their own cart identity (kind 'product' + database id);
// a tracked product with stock 0 shows "Out of stock" and cannot be added.
export default function AddToCartButton({ product, className, children = 'Add to Cart', ...rest }) {
  const addToCart = useAddToCart()
  const soldOut = product.available === false
  return (
    <button
      type="button"
      className={className}
      data-opens-cart
      disabled={soldOut}
      aria-disabled={soldOut || undefined}
      onClick={() => {
        if (soldOut) return
        addToCart(product.source === 'db'
          ? { kind: 'product', productId: product.productId, summary: { name: product.name, slug: product.slug, image: product.image, type: product.type, price: product.price, compareAtPrice: product.compareAtPrice, available: product.available } }
          : { kind: product.type, productId: product.productId })
      }}
      {...rest}
    >
      {soldOut ? 'Out of stock' : children}
    </button>
  )
}
