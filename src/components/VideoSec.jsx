'use client'

import { useEffect, useRef } from 'react'

export default function PremiumParallax() {
  const imageRefs = useRef([])
  const ticking = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          imageRefs.current.forEach((image) => {
            if (!image) return

            const section = image.closest('.luxury-section')
            if (!section) return

            const rect = section.getBoundingClientRect()
            const windowHeight = window.innerHeight
            const sectionHeight = section.offsetHeight

            const scrollProgress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight + sectionHeight)))

            const move = (scrollProgress - 0.5) * 450

            let scale = 1 + (0.5 - Math.abs(scrollProgress - 0.5)) * 0.45
            scale = Math.max(1, Math.min(scale, 1.25))

            image.style.transform = `translateY(${move}px) scale(${scale})`
            image.style.willChange = 'transform'
          })

          ticking.current = false
        })

        ticking.current = true
      }
    }

    document.getElementById('main-scroller')?.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => document.getElementById('main-scroller')?.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main className="luxury-main">
      <section className="luxury-section">
        <div className="luxury-image-wrap">
          <video
            ref={el => {
              if (el && !imageRefs.current.includes(el)) {
                imageRefs.current.push(el)
              }
            }}
            className="luxury-image"
            src="/videos/sec-video.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </section>
    </main>
  )
}