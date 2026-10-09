'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import CustomEase from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)

try {
  CustomEase.create('softReveal', '0.5, 0, 0, 1')
  CustomEase.create('smoothBlur', '0.25, 0.1, 0.25, 1')
} catch (e) {
}

export default function CreativeVideoSection() {
  const sectionRef = useRef(null)

  useEffect(() => {

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
      const videoContainer = document.querySelector('.video-box')

      const tl = gsap.timeline({
        scrollTrigger: {
          scroller: '#main-scroller',
          trigger: '.scroll-container',
          start: 'top 100%',
          end: 'bottom 50%',
          scrub: 0,
          invalidateOnRefresh: true,
        },
      })
      triggers.push(tl.scrollTrigger)

      tl.to(videoContainer, {
        width: '100%',
        height: '100vh',
        ease: 'none',
      })
        .to('.main-video', { scale: 1.05, ease: 'none' }, 0)

      innerCleanup = () => {
        triggers.forEach((t) => t?.kill())
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
    <section className="creative-sec" ref={sectionRef}>

      <div className="scroll-container">
        <div className="video-wrapper">
          <div className="video-box">
            <video
              className="main-video"
              src="/videos/scroll-video.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </div>
      </div>

    </section>
  )
}
