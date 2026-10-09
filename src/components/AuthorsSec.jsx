'use client'

import React, { useEffect, useRef } from 'react'
import SplitType from 'split-type'

const AuthorsSec = () => {
  const sectionRef = useRef(null)
  const img1Ref = useRef(null)
  const img2Ref = useRef(null)
  const para1Ref = useRef(null)
  const para2Ref = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const section = sectionRef.current
    if (!section) return

    // ===========================
    // SPLIT TEXT SETUP
    // ===========================
    const subHeading = new SplitType('.authors-sub', { types: 'chars' })
    const mainHeading = new SplitType('.authors-hd', { types: 'words,chars' })

    const lines = section.querySelectorAll('.authors-hd .word')
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

    if (para1Ref.current) {
      para1Ref.current.style.opacity = '0'
      para1Ref.current.style.transform = 'translateY(30px)'
      para1Ref.current.style.filter = 'blur(8px)'
    }
    if (para2Ref.current) {
      para2Ref.current.style.opacity = '0'
      para2Ref.current.style.transform = 'translateY(30px)'
      para2Ref.current.style.filter = 'blur(8px)'
    }

    if (img1Ref.current) {
      img1Ref.current.style.opacity = '0'
      img1Ref.current.style.transform = 'scale(0.7) rotateY(-15deg) rotateX(10deg) translateZ(0)'
      img1Ref.current.style.filter = 'blur(12px) brightness(0.8)'
    }
    if (img2Ref.current) {
      img2Ref.current.style.opacity = '0'
      img2Ref.current.style.transform = 'scale(0.7) rotateY(-15deg) rotateX(10deg) translateZ(0)'
      img2Ref.current.style.filter = 'blur(12px) brightness(0.8)'
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

          if (para1Ref.current) {
            setTimeout(() => {
              para1Ref.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
              para1Ref.current.style.opacity = '1'
              para1Ref.current.style.transform = 'translateY(0)'
              para1Ref.current.style.filter = 'blur(0px)'
            }, 600)
          }
          if (para2Ref.current) {
            setTimeout(() => {
              para2Ref.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
              para2Ref.current.style.opacity = '1'
              para2Ref.current.style.transform = 'translateY(0)'
              para2Ref.current.style.filter = 'blur(0px)'
            }, 750)
          }

          if (img1Ref.current) {
            setTimeout(() => {
              img1Ref.current.style.transition = 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
              img1Ref.current.style.opacity = '1'
              img1Ref.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg) translateZ(0)'
              img1Ref.current.style.filter = 'blur(0px) brightness(1)'
            }, 200)

          }

          if (img2Ref.current) {
            setTimeout(() => {
              img2Ref.current.style.transition = 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
              img2Ref.current.style.opacity = '1'
              img2Ref.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg) translateZ(0)'
              img2Ref.current.style.filter = 'blur(0px) brightness(1)'
            }, 350)
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
        <section className='authors-sec' ref={sectionRef}>
            <div className="container">
                <div className="row">
                    <div className="col-md-6 col-lg-3 order-md-1 order-lg-1">
                        <img ref={img1Ref} src="/images/authors.webp" alt="Authors" className='authors img-fluid' />
                    </div>
                    <div className="col-md-12 col-lg-6 order-md-3 order-lg-2">
                        <h5 className="authors-sub">The Founders</h5>
                        <h1 className='authors-hd'>TWO LIFELONG ENTHUSIASTS<br></br> ONE SHARED PASSION.</h1>
                        <p ref={para1Ref}>We're Albert Lai and Jayson De Castro, two lifelong watch enthusiasts turned creators. Albert is a physician and entrepreneur. With a deep passion for design and engineering precision, Jayson is a designer and watch reviewer who has spent years studying the details that make a timepiece truly memorable.</p>
                        <p ref={para2Ref}>Together, we've co-founded Valour Watches to bring high-concept, beautifully constructed mechanical watches to life at a price that doesn't compromise on vision or quality.</p>
                    </div>
                    <div className="col-md-6 col-lg-3 order-md-2 order-lg-3">
                        <img ref={img2Ref} src="/images/founder-img.webp" alt="" className='img-fluid author-img' />
                    </div>
                </div>
            </div>

        </section>
    )
}

export default AuthorsSec
