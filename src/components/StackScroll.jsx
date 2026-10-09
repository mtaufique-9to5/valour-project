'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)


export default function StackScroll() {
  useEffect(() => {
    // ── Ordered selectors matching page layout ──────────────────────────
    const SELECTORS = [
      '.hero-canvas-sec',
      '.know-split-sec',
      '.product-sec',
      '.luxury-main',
      '.luxury-main2',
      '.creative-sec',
      '.watch-sec',
      '.testi-sec',
      '.form-sec',
    ]

    const sections = SELECTORS
      .map(s => document.querySelector(s))
      .filter(Boolean)

    if (sections.length < 2) return

    const triggers = []

    // ── 1. Base sticky setup ────────────────────────────────────────────
    sections.forEach((sec, i) => {
      // Sticky position — section pins while next scrolls over it
      sec.style.position = 'sticky'
      sec.style.top = '0px'

      // Z-index: each section sits above the previous
      sec.style.zIndex = String(10 + i)

      // GPU compositing hints
      sec.style.willChange = 'transform, opacity'
      sec.style.backfaceVisibility = 'hidden'
      sec.style.webkitBackfaceVisibility = 'hidden'

      // Transform origin: scale from upper-center for a "card push-back" feel
      sec.style.transformOrigin = 'center 30%'
    })

    // ── 2. Outgoing section: scale + dim as next section rises over it ──
    sections.forEach((sec, i) => {
      const next = sections[i + 1]
      if (!next) return

      // How far the next section travels before fully covering this one
      // start: next section's top hits 90% of viewport (just peeking in)
      // end:   next section's top reaches 0 (fully on screen)
      const st = ScrollTrigger.create({
        trigger: next,
        start: 'top 92%',
        end: 'top 0%',
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const p = self.progress  // 0 → 1

          // Outgoing: recede into depth — scale 1 → 0.93, brightness 1 → 0.72
          const scale = 1 - p * 0.07
          const bright = 1 - p * 0.28
          const radius = p * 16  // subtle corner reveal as it recedes

          gsap.set(sec, {
            scale,
            filter: `brightness(${bright.toFixed(3)})`,
            borderRadius: `${radius.toFixed(1)}px`,
            overwrite: false,
          })

          // Incoming: slide up from 3% offset to 0
          const inY = (1 - p) * 3  // translateY% — very subtle
          gsap.set(next, {
            yPercent: inY,
            overwrite: false,
          })
        },
        onLeaveBack() {
          // Snap back cleanly when scrolling up past trigger
          gsap.to(sec, {
            scale: 1,
            filter: 'brightness(1)',
            borderRadius: '0px',
            duration: 0.45,
            ease: 'power2.out',
            overwrite: true,
          })
          gsap.to(next, {
            yPercent: 0,
            duration: 0.45,
            ease: 'power2.out',
            overwrite: true,
          })
        },
        onLeave() {
          // Ensure values are locked at final state
          gsap.set(sec, {
            scale: 0.93,
            filter: 'brightness(0.72)',
            borderRadius: '16px',
          })
          gsap.set(next, { yPercent: 0 })
        },
      })

      triggers.push(st)
    })

    // ── 3. Final section resets to full scale/brightness ───────────────
    // The last section never gets pushed so restore it cleanly
    const last = sections[sections.length - 1]
    gsap.set(last, { scale: 1, filter: 'brightness(1)', yPercent: 0 })

    ScrollTrigger.refresh()

    // ── Cleanup ─────────────────────────────────────────────────────────
    return () => {
      triggers.forEach(t => t?.kill())
      sections.forEach(sec => {
        gsap.set(sec, { clearProps: 'all' })
        sec.style.position = ''
        sec.style.top = ''
        sec.style.zIndex = ''
        sec.style.willChange = ''
        sec.style.backfaceVisibility = ''
        sec.style.webkitBackfaceVisibility = ''
        sec.style.transformOrigin = ''
      })
    }
  }, [])

  return null
}
