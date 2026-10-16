'use client'
import WatchDetail from './WatchDetail'
import StrapDetail from './StrapDetail'

// The single product-page entry point. Each product type keeps its own layout
// (the watch storytelling page, the strap shop page); both are built from the
// shared price, Add to Cart, specs and related-products components.
const LAYOUTS = {
  watch: WatchDetail,
  strap: StrapDetail,
}

export default function ProductDetail({ product }) {
  const Layout = product ? LAYOUTS[product.type] : undefined
  return Layout ? <Layout product={product} /> : null
}
