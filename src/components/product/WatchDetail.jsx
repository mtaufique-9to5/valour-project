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

// Watch layout: the full-screen storytelling page (seven sections plus the
// footer, each a snap section inside ScrollProvider). Its Add to Cart is the
// shared AddToCartButton inside HeroInner. Every section's content comes from the
// product (admin: Product page); a section with no content at all is left out so
// the page never scrolls to an empty screen. The hero is always shown.
const filled = (sec) => Boolean(sec && (sec.heading || sec.text || sec.specs?.length))

export default function WatchDetail({ product }) {
  const pdp = product.pdp ?? {}
  const img = product.sectionImages ?? {}
  const show = {
    intro: filled(pdp.intro) || Boolean(img.introLeft || img.introRight),
    parallax1: filled(pdp.parallax1) || Boolean(img.parallax1),
    movement: filled(pdp.movement) || Boolean(img.movement),
    parallax2: filled(pdp.parallax2) || Boolean(img.parallax2),
    dial: filled(pdp.dial) || Boolean(img.dial),
    strap: filled(pdp.strap) || Boolean(img.strapLeft || img.strapRight),
  }
  return (
    <div
      className="min-h-full flex flex-col home"
      style={{ overflow: 'hidden', height: '100vh', '--accent': product.accent }}
    >
      <PageTransition />
      <ScrollProvider>
        <Header />
        <div className="snap-section"><HeroSection product={product} /></div>
        {show.intro && <div className="snap-section"><DetailSec product={product} /></div>}
        {show.parallax1 && <div className="snap-section"><ParraSec1 product={product} /></div>}
        {show.movement && <div className="snap-section"><DetailSec2 product={product} /></div>}
        {show.parallax2 && <div className="snap-section"><ParraSec2 product={product} /></div>}
        {show.dial && <div className="snap-section"><DetailSec3 product={product} /></div>}
        {show.strap && <div className="snap-section"><StrapSec product={product} /></div>}
        <div className="snap-section"><Footer /></div>
      </ScrollProvider>
    </div>
  )
}
