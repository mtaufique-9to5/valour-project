'use client'
import HeroSection from '@/app/our-shop/components/HeroSection'
import DetailSec from '@/app/our-shop/components/DetailSec'
import DetailSec2 from '@/app/our-shop/components/DetailSec2'
import DetailSec3 from '@/app/our-shop/components/DetailSec3'
import ParraSec1 from '@/app/our-shop/components/ParraSec1'
import ParraSec2 from '@/app/our-shop/components/ParraSec2'
import StrapSec from '@/app/our-shop/components/StrapSec'
import '@/app/our-shop/[slug]/pdetails.css'
import '@/app/globals.css'
import PageTransition from '@/components/PageTransition'
import ScrollProvider from '@/components/ScrollProvider'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Watch layout: the full-screen storytelling page, unchanged (seven sections
// plus the footer, each a snap section inside ScrollProvider). Its Add to Cart
// is the shared AddToCartButton inside HeroInner.
export default function WatchDetail({ product }) {
  return (
    <div
      className="min-h-full flex flex-col home"
      style={{ overflow: 'hidden', height: '100vh', '--accent': product.accent }}
    >
      <PageTransition />
      <ScrollProvider>
        <Header />
        <div className="snap-section"><HeroSection product={product} /></div>
        <div className="snap-section"><DetailSec product={product} /></div>
        <div className="snap-section"><ParraSec1 product={product} /></div>
        <div className="snap-section"><DetailSec2 product={product} /></div>
        <div className="snap-section"><ParraSec2 product={product} /></div>
        <div className="snap-section"><DetailSec3 product={product} /></div>
        <div className="snap-section"><StrapSec product={product} /></div>
        <div className="snap-section"><Footer /></div>
      </ScrollProvider>
    </div>
  )
}
