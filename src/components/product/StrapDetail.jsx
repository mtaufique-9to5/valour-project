'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { STRAP_DESCRIPTION, STRAP_SPECS } from '@/data/catalog'
import AddToCartButton from './AddToCartButton'
import ProductPrice, { getPriceLabel } from './ProductPrice'
import ProductSpecs from './ProductSpecs'
import RelatedProducts from './RelatedProducts'
import './product-detail.css'
import './strap-detail.css'

// Strap layout: banner, details (photo, price, description, specs, Add to Cart)
// and related straps. Straps share one confirmed description and spec list.
export default function StrapDetail({ product }) {
  return (
    <div className="strap-page">
      <Header />

      <main>
        {/* Banner */}
        <section className={`strap-hero ${product.color}`} aria-labelledby="strap-title">
          <div className="container">
            <div className="strap-hero-inner">
              <div className="strap-hero-text">
                <p className="strap-eyebrow">Valour Straps · {product.ref}</p>
                <h1 id="strap-title" className="strap-hero-title">{product.name}</h1>
                <p className="strap-hero-sub">Hybrid Sailcloth / FKM Rubber Strap</p>
              </div>
              <div className="strap-hero-image">
                <img src={product.image} alt={product.name} />
              </div>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="strap-details" aria-labelledby="strap-details-name">
          <div className="container">
            <div className="row gy-5 gx-lg-5 align-items-start">
              <div className="col-12 col-lg-6">
                <div className={`strap-gallery ${product.color}`}>
                  <img src={product.image} alt={`${product.name}, front view`} />
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="strap-info">
                  <p className="pd-ref">{product.ref}</p>
                  <h2 id="strap-details-name" className="strap-name">{product.name}</h2>
                  <ProductPrice product={product} className="strap-price" />
                  <span className="strap-divider" aria-hidden="true" />
                  <p className="strap-description">{STRAP_DESCRIPTION}</p>
                  <ProductSpecs specs={STRAP_SPECS} title="Strap Specifications" />
                  <AddToCartButton product={product} className="theme-btn strap-add-btn">
                    Add to Cart · {getPriceLabel(product)}
                  </AddToCartButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <RelatedProducts
          product={product}
          title="Related Straps"
          subtitle="Discover more straps designed to complement your Valour timepiece."
        />
      </main>

      <Footer />
    </div>
  )
}
