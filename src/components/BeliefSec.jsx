'use client'

import Link from 'next/link'
import React, { useEffect, useRef } from 'react'
import SplitType from 'split-type'

const BeliefSec = () => {
  const sectionRef = useRef(null)
  const paraRef = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const section = sectionRef.current
    if (!section) return

    // ===========================
    // SPLIT TEXT SETUP
    // ===========================
    const subHeading = new SplitType('.belief-sub', { types: 'chars' })
    const mainHeading = new SplitType('.belief-hd', { types: 'words,chars' })

    const lines = section.querySelectorAll('.belief-hd .word')
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

    if (btnRef.current) {
      btnRef.current.style.opacity = '0'
      btnRef.current.style.transform = 'translateY(30px)'
      btnRef.current.style.filter = 'blur(8px)'
    }

    // ===========================
    // INTERSECTION OBSERVER
    // ===========================
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

          if (btnRef.current) {
            setTimeout(() => {
              btnRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
              btnRef.current.style.opacity = '1'
              btnRef.current.style.transform = 'translateY(0)'
              btnRef.current.style.filter = 'blur(0px)'
            }, 750)

            btnRef.current.addEventListener('mouseenter', () => {
              btnRef.current.style.transition = 'all 0.4s ease-out'
              btnRef.current.style.transform = 'translateY(-3px) scale(1.05)'
              btnRef.current.style.filter = 'drop-shadow(0 15px 30px rgba(0,212,255,0.4))'
            })

            btnRef.current.addEventListener('mouseleave', () => {
              btnRef.current.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
              btnRef.current.style.transform = 'translateY(0) scale(1)'
              btnRef.current.style.filter = 'drop-shadow(0 0px 0px rgba(0,212,255,0))'
            })
          }

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
        <section className='belief-sec' ref={sectionRef}>
            <div className="container">
                <div className="row">
                    <div className="text-sec">
                    <h5 className="belief-sub">Our Belief</h5>
                    <h1 className='belief-hd'>ANYTHING LESS IS <br></br> SIMPLY UNACCEPTABLE.</h1>
                    <p ref={paraRef}>Rejecting the ordinary to create timeless, extraordinary masterpieces.</p>
                        <Link ref={btnRef} href='/our-shop' className='theme-btn belief-btn'>View Collection</Link>

                    </div>
                </div>
            </div>
        </section>
    )
}

export default BeliefSec
