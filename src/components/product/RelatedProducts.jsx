'use client'
import Link from 'next/link'
import { getProductHref } from '@/app/features/product/productUrl'
import AddToCartButton from './AddToCartButton'
import ProductPrice from './ProductPrice'
import './product-detail.css'

// Image and name both open the product; the image link is left out of the Tab
// order so each card has one link and one button.
const RelatedCard = ({ product }) => {
  const href = getProductHref(product)
  return (
    <article className="pd-card">
      <Link href={href} className="pd-card-image" tabIndex={-1} aria-hidden="true">
        <img src={product.image} alt="" loading="lazy" />
      </Link>
      <div className="pd-card-info">
        <p className="pd-ref">{product.ref}</p>
        <h3 className="pd-card-name">
          <Link href={href}>{product.name}</Link>
        </h3>
        <ProductPrice product={product} className="pd-card-price" />
        <AddToCartButton product={product} className="theme-btn pd-card-btn" aria-label={`Add ${product.name} to cart`} />
      </div>
    </article>
  )
}

// `related`: the next products of the same type, worked out on the server
// (published database products and the static catalog).
export default function RelatedProducts({ product, related: all = [], title, subtitle, count = 4 }) {
  const related = all.slice(0, count)
  if (!related.length) return null
  const titleId = `pd-related-${product.key.replace(':', '-')}`
  return (
    <section className="pd-related" aria-labelledby={titleId}>
      <div className="container">
        <div className="pd-related-head">
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="pd-grid">
          {related.map((item) => (
            <RelatedCard key={item.key} product={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
