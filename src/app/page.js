'use client'

import Header from "@/components/Header"
import HeroSec from "@/components/HeroSec"
import KnowSec from "@/components/KnowSec"
import ProductSec from "@/components/ProductSec"
import VideoSec from "@/components/VideoSec"
import CreativeVideoSection from "@/components/CreativeVideoSection"
import WatchSec from "@/components/WatchSec"
import TestimonialSec from "@/components/TestimonialSec"
import Footer from "@/components/Footer"
import SliderImage from "@/components/SliderImage"
import PageTransition from "@/components/PageTransition"
import ScrollProvider from "@/components/ScrollProvider"
import "../app/our-shop/shop.css"

export default function Home() {
  return (
    <div className="min-h-full flex flex-col home" style={{ overflow: 'hidden', height: '100vh' }}>
      <PageTransition />
      <ScrollProvider>

        <Header />
        <div className="snap-section">
          <HeroSec />
        </div>

        <div className="snap-section">
          <KnowSec />
        </div>

        <div className="snap-section">
          <ProductSec />
        </div>

        <div className="snap-section">
          <VideoSec />
        </div>

        <div className="snap-section">
          <SliderImage />
        </div>

        <div className="snap-section">
          <CreativeVideoSection />
        </div>

        <div className="snap-section">
          <WatchSec />
        </div>

        <div className="snap-section">
          <TestimonialSec />
        </div>

        {/* <div className="snap-section">
        <FormSec />
      </div> */}

        <div className="snap-section">
          <VideoSec />
        </div>

        <div className="snap-section">
          <Footer />
        </div>

      </ScrollProvider>
    </div>
  )
}
