'use client'

import { useEffect, useRef } from 'react'
import HeroInner from "./HeroInner"

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

                        // Calculate scroll progress (0 to 1)
                        const scrollProgress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight + sectionHeight)))

                        // Smooth parallax movement - increased for more effect
                        const move = (scrollProgress - 0.5) * 450

                        // Dynamic scale - zoom in as it comes into view
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
        handleScroll() // Initial call

        return () => document.getElementById('main-scroller')?.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <main className="luxury-main">
            <section className="luxury-section">

                <div className="luxury-image-wrap">
                    <img
                        ref={el => {
                            if (el && !imageRefs.current.includes(el)) {
                                imageRefs.current.push(el)
                            }
                        }}
                        className="luxury-image"
                        src="/images/p-hero-img.webp"
                        alt="Luxury watch hero"
                    />
                </div>
                <HeroInner />
            </section>
        </main>
    )
}