'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { FiPlus } from 'react-icons/fi'
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css';
import 'swiper/css/pagination';
import Link from 'next/link'
import { useSelector } from 'react-redux'


gsap.registerPlugin(ScrollTrigger)

const ProductSec = () => {
  const products = useSelector((state) => state.product.value)

  const sectionRef = useRef(null)
  const perspRef = useRef(null)


  function createSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  useEffect(() => {
    const section = sectionRef.current
    const persp = perspRef.current
    if (!section || !persp) return

    let mounted = true
    let timeoutId
    let innerCleanup = null

    const setupAnimations = () => {
      if (!mounted) return

      const scroller = document.getElementById('main-scroller')
      if (!scroller) {
        timeoutId = setTimeout(setupAnimations, 100)
        return
      }

      const triggers = []
      const cards = section.querySelectorAll('.pro-card')
      const cardListeners = []


      cards.forEach((card) => {
        const img = card.querySelector('img')
        const shine = card.querySelector('.card-shine')
        const icon = card.querySelector('svg')

        const onEnter = () => {
          gsap.to(img, { y: -16, scale: 1.08, duration: 0.5, ease: 'power2.out' })
          if (shine) {
            gsap.fromTo(
              shine,
              { x: '-120%', opacity: 0.6 },
              { x: '220%', opacity: 0.2, duration: 0.7, ease: 'power2.in' }
            )
          }
          if (icon) gsap.to(icon, { rotate: 135, scale: 1.3, duration: 0.4, ease: 'back.out(2)' })
        }
        const onLeave = () => {
          gsap.to(img, { y: 0, scale: 1, duration: 0.6, ease: 'power3.out' })
          if (icon) gsap.to(icon, { rotate: 0, scale: 1, duration: 0.4, ease: 'power2.out' })
        }

        card.addEventListener('mouseenter', onEnter)
        card.addEventListener('mouseleave', onLeave)
        cardListeners.push({ card, onEnter, onLeave })
      })

      const heading = section.querySelector('h2')
      if (heading) {
        gsap.set(heading, { letterSpacing: '0.5em', opacity: 0 })
        const a = gsap.to(heading, {
          letterSpacing: '0.02em',
          opacity: 1,
          duration: 1.4,
          ease: 'power4.out',
          scrollTrigger: {
            scroller: '#main-scroller',
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
            invalidateOnRefresh: true,
          },
        })
        triggers.push(a.scrollTrigger)
      }

      ScrollTrigger.refresh()

      innerCleanup = () => {
        triggers.forEach((t) => t?.kill())
        cardListeners.forEach(({ card, onEnter, onLeave }) => {
          card.removeEventListener('mouseenter', onEnter)
          card.removeEventListener('mouseleave', onLeave)
        })
      }
    }

    setupAnimations()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (innerCleanup) innerCleanup()
    }
  }, [])

  return (
    <section className='product-sec' ref={sectionRef}>
      <div className="container">
        <h2>Provide You Best Watch Collection</h2>

        <div ref={perspRef} style={{ transformStyle: 'preserve-3d' }}>
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={20}
            slidesPerView={1}
            loop={true}
            autoplay={{
              delay: 2000,
              disableOnInteraction: true,
            }}
            pagination={{ clickable: true }}
            breakpoints={{
              575: {
                slidesPerView: 1,
                spaceBetween: 10,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 10,
              },
              991: {
                slidesPerView: 2,
                spaceBetween: 15,  // below 991 = 20
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 15,  // below 1024 = 20
              },
              1200: {
                slidesPerView: 4,
                spaceBetween: 20,  // below 1200 = 20
              },
              1400: {
                slidesPerView: 4,
                spaceBetween: 20,  // above 1400 = 40
              },
            }}
          >
            {products.map((watch, index) => (
              <SwiperSlide>
                <Link href="/p-details" className='cards-link'>
                  {/* <div className="pro-card">
                    <img src={item.image} alt="watch" />
                    <div className="details">
                      <div>
                        <h6>{item.detail}</h6>
                        <h5>{item.name}</h5>
                      </div>
                      <FiPlus />
                    </div>
                  </div> */}
                  <div
                    key={watch.id}
                    data-id={watch.id}
                    className={`ht-card ${watch.color}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                    // onClick={() => handleCart(watch)}
                    // onClick={() => router.push("/p-details")}
                  >
                    <div className="ht-card-inner">
                      <div className="ht-card-glow" />

                      {watch.limited && (
                        <div className="ht-limited-badge">
                          <span>Limited</span>
                        </div>
                      )}

                      <div className="ht-image-wrap">
                        <div className="ht-shimmer" />
                        <img
                          src={watch.image}
                          alt={watch.name}
                          className="ht-card-img"
                          loading="lazy"
                        />
                        <div className="ht-hover-overlay">
                          <div className="ht-hover-content">
                            <div className="ht-hover-line">
                              <div className="line" />
                              <span>Explore</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ht-card-info">
                        <div className="ht-card-header">
                          <div>
                            <p className="ht-card-ref">{watch.ref}</p>
                            <h3 className="ht-card-name">{watch.name}</h3>
                          </div>
                          <div className="ht-card-arrow">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                        <p className="ht-card-subtitle">{watch.subtitle}</p>
                        <div className="ht-card-specs">
                          <span>{watch.material}</span>
                          <div className="dot" />
                          <span>{watch.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  )
}

export default ProductSec