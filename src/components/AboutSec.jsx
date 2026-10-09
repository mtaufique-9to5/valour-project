'use client'

import React, { useEffect, useRef } from 'react'
import SplitType from 'split-type'
import AOS from 'aos'
import 'aos/dist/aos.css'

const AboutSec = () => {
  const sectionRef = useRef(null)
  const imgRef = useRef(null)
  const paraRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize AOS
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      mirror: false,
    })

    const section = sectionRef.current
    if (!section) return

    // ===========================
    // SPLIT TEXT SETUP
    // ===========================
    const subHeading = new SplitType('.about-sub', { types: 'chars' })
    const mainHeading = new SplitType('.about-hd', { types: 'words,chars' })

    // Wrap lines for main heading
    const lines = section.querySelectorAll('.about-hd .word')
    lines.forEach(line => {
      line.style.overflow = 'hidden'
      line.style.display = 'inline-block'
    })

    // ===========================
    // INITIAL STATES
    // ===========================
    subHeading.chars?.forEach((char, i) => {
      char.style.display = 'inline-block'
      char.style.opacity = '0'
      char.style.transform = 'translateX(-20px) rotateY(-90deg)'
      char.style.transformOrigin = 'left center'
    })

    mainHeading.chars?.forEach((char, i) => {
      char.style.display = 'inline-block'
      char.style.opacity = '0'
      char.style.transform = 'translateY(40px) rotateX(90deg)'
      char.style.transformOrigin = 'center bottom'
    })

    if (paraRef.current) {
      paraRef.current.style.opacity = '0'
      paraRef.current.style.transform = 'translateY(30px)'
      paraRef.current.style.filter = 'blur(8px)'
    }

    if (imgRef.current) {
      imgRef.current.style.opacity = '0'
      imgRef.current.style.transform = 'scale(0.7) rotateY(-15deg) rotateX(10deg) translateZ(0)'
      imgRef.current.style.filter = 'blur(12px) brightness(0.8)'
    }

    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          subHeading.chars?.forEach((char, i) => {
            setTimeout(() => {
              char.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
              char.style.opacity = '1'
              char.style.transform = 'translateX(0) rotateY(0deg)'
            }, i * 30)
          })

          mainHeading.chars?.forEach((char, i) => {
            setTimeout(() => {
              char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
              char.style.opacity = '1'
              char.style.transform = 'translateY(0) rotateX(0deg)'
            }, i * 35 + 200)
          })

          if (paraRef.current) {
            setTimeout(() => {
              paraRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
              paraRef.current.style.opacity = '1'
              paraRef.current.style.transform = 'translateY(0)'
              paraRef.current.style.filter = 'blur(0px)'
            }, 600)
          }

          if (imgRef.current) {
            setTimeout(() => {
              imgRef.current.style.transition = 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
              imgRef.current.style.opacity = '1'
              imgRef.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg) translateZ(0)'
              imgRef.current.style.filter = 'blur(0px) brightness(1)'
            }, 300)


            imgRef.current.addEventListener('mouseleave', () => {
              imgRef.current.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
              imgRef.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg)'
              imgRef.current.style.filter = 'blur(0px) brightness(1)'
            })
          }

          // Unobserve after animation completes
          observer.unobserve(section)
        }
      })
    }, observerOptions)

    observer.observe(section)

    // Cleanup
    return () => {
      observer.disconnect()
      subHeading.revert?.()
      mainHeading.revert?.()
    }
  }, [])

  return (
    <section className='about-sec' ref={sectionRef}>
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <h5 className="about-sub">About Us</h5>
            <h1 className='about-hd'>INSPIRED BY VISION<br></br> BUILT ON PRECISION.</h1>
            <p ref={paraRef} data-aos="fade-up" data-aos-delay="600">Valour's goal is to bring inspired designs within reach for all collectors and enthusiasts.
              With Lucent, we focused on dimensionality, execution, and presence.</p>
          </div>
          <div className="col-md-6">
            <div className="img-box">
              <img ref={imgRef} src="/images/about-img.webp" alt="" className="abt-img" data-aos="fade-up" data-aos-delay="400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSec
