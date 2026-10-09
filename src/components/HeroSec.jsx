'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function lerpPaths(a, b, t) {
  const numsA = a.match(/-?[\d.]+/g).map(Number)
  const numsB = b.match(/-?[\d.]+/g).map(Number)
  let i = 0
  return a.replace(/-?[\d.]+/g, () => {
    const v = numsA[i] + (numsB[i] - numsA[i]) * t
    i++
    return v.toFixed(2)
  })
}

const TEXT = 'VALOUR'
const CHAR_DELAY = 360  
const CHAR_FADE = 500  

export default function HeroSec() {
  const canvasRef = useRef(null)
  const sectionRef = useRef(null)
  const blobRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let W = 0, H = 0
    let raf
    let running = true
    const startTime = performance.now()

    const charAlpha = new Array(TEXT.length).fill(0)

    const resizeCanvas = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resizeCanvas()

    const draw = (time) => {
      if (!running) return
      ctx.clearRect(0, 0, W, H)

      const elapsed = time - startTime
      const cx = W / 2
      const cy = H / 2
      const fontSize = Math.min(W * 0.22, 180)

      ctx.font = `700 ${fontSize}px "Times New Roman", serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'

      const totalWidth = ctx.measureText(TEXT).width
      let startX = cx - totalWidth / 2

      TEXT.split('').forEach((_, i) => {
        const charStart = i * CHAR_DELAY
        const charElapsed = elapsed - charStart
        charAlpha[i] = Math.min(Math.max(charElapsed / CHAR_FADE, 0), 1)
        charAlpha[i] = 1 - Math.pow(1 - charAlpha[i], 2)
      })

      const allRevealed = charAlpha[TEXT.length - 1] >= 1

      let x = startX
      TEXT.split('').forEach((char, i) => {
        const alpha = charAlpha[i]
        if (alpha <= 0) {
          x += ctx.measureText(char).width
          return
        }

        const offsetY = (1 - alpha) * 18

        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.fillText(char, x, cy + offsetY)

        x += ctx.measureText(char).width
      })

      if (allRevealed) {
        const sweepX = cx + Math.sin(time * 0.001) * (W * 0.5)
        ctx.save()
        ctx.globalCompositeOperation = 'source-atop'
        const beam = ctx.createLinearGradient(sweepX - 80, 0, sweepX + 80, 0)
        beam.addColorStop(0, 'rgba(255,255,255,0)')
        beam.addColorStop(0.5, 'rgba(255,255,255,0.6)')
        beam.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = beam
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
      }

      const handStart = (TEXT.length - 1) * CHAR_DELAY
      const handElapsed = Math.max(elapsed - handStart, 0)
      const handProgress = Math.min(handElapsed / 800, 1)
      const handAlpha = 1 - Math.pow(1 - handProgress, 3)

      const continuousAngle = (time * 0.001) % (Math.PI * 2) - Math.PI / 2
      const revealAngle = -Math.PI / 2 + handProgress * Math.PI * 2
      const angle = handProgress < 1 ? revealAngle : continuousAngle
      const r = Math.min(W, H) * 0.36

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let mounted = true
    let timeoutId
    let innerCleanup = null

    const setupScroll = () => {
      if (!mounted) return

      const el = sectionRef.current
      if (!el) return

      const scroller = document.getElementById('main-scroller')
      if (!scroller) {
        timeoutId = setTimeout(setupScroll, 100)
        return
      }


      const anim = gsap.to(el, {
        backgroundSize: '118%',
        ease: 'none',
        scrollTrigger: {
          scroller: '#main-scroller',
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 2.2,
          invalidateOnRefresh: true,
        },
      })

      innerCleanup = () => anim.scrollTrigger?.kill()
    }

    setupScroll()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (innerCleanup) innerCleanup()
    }
  }, [])

  return (
    <section className='hero-sec hero-canvas-sec' ref={sectionRef}>
      <video 
        className='hero-video-bg' 
        autoPlay 
        loop 
        muted 
        playsInline
        src="/videos/hero-bg-video.mp4"
      />

      <div className='hero-vignette' />

      <canvas ref={canvasRef} className='hero-canvas' />

    </section>
  )
}