'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AddToCartButton from './AddToCartButton'
import ProductPrice, { getPriceLabel } from './ProductPrice'
import ProductSpecs from './ProductSpecs'
import RelatedProducts from './RelatedProducts'
import './product-detail.css'
import './strap-detail.css'

// Strap layout: banner, details (photo, price, description, specs, Add to Cart)
// and related straps. Description and specs are the strap's own (from the admin).
export default function StrapDetail({ product, related }) {
  const description = product.longDescription || product.shortDescription
  const specs = product.specs
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
                {product.subtitle && <p className="strap-hero-sub">{product.subtitle}</p>}
              </div>
              <div className="strap-hero-image">
                {/* Strap hero image (admin: Strap Hero → Hero image), else the main image. */}
                <img src={product.heroImage ?? product.image} alt={product.name} />
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
                  {/* Strap details image (admin: Strap Details → Detail image), else the main image. */}
                  <img src={product.detailImage ?? product.image} alt={`${product.name}, front view`} />
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="strap-info">
                  <p className="pd-ref">{product.ref}</p>
                  <h2 id="strap-details-name" className="strap-name">{product.name}</h2>
                  <ProductPrice product={product} className="strap-price" />
                  <span className="strap-divider" aria-hidden="true" />
                  {description && <p className="strap-description">{description}</p>}
                  <ProductSpecs specs={specs} title="Strap Specifications" />
                  <AddToCartButton product={product} className="theme-btn strap-add-btn">
                    {product.available === false ? 'Out of stock' : <>Add to Cart · {getPriceLabel(product)}</>}
                  </AddToCartButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <RelatedProducts
          product={product}
          related={related}
          title="Related Straps"
          subtitle="Discover more straps designed to complement your Valour timepiece."
        />
      </main>

      <Footer />
    </div>
  )
}
