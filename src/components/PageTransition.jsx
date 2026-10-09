'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function PageTransition() {
  const overlayRef = useRef(null)
  const panelsRef = useRef([])

  useEffect(() => {
    const panels = panelsRef.current.filter(Boolean)
    if (!panels.length) return

    // Entry animation - panels slide up out of view with improved easing
    const tl = gsap.timeline()
    tl.set(panels, { scaleY: 1, transformOrigin: 'top center' })
    tl.to(panels, {
      scaleY: 0,
      duration: 0.95,
      stagger: 0.07,
      ease: 'power4.inOut',
      transformOrigin: 'top center',
      delay: 0.12,
    })
    tl.set(overlayRef.current, { display: 'none' })
  }, [])

  const colors = ['#000', '#000', '#000', '#000', '#000']

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        pointerEvents: 'none',
      }}
    >
      {colors.map((color, i) => (
        <div
          key={i}
          ref={(el) => (panelsRef.current[i] = el)}
          style={{
            flex: 1,
            backgroundColor: color,
            height: '100%',
            transformOrigin: 'top center',
          }}
        />
      ))}
    </div>
  )
}
