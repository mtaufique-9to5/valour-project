'use client'

import { useEffect, useRef } from 'react'
import { FaStar } from 'react-icons/fa6'


const EASE_SMOOTH  = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_BOUNCE  = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

const T = {
  image:   0,     
  boxes:   100,   
  boxStep: 150,    
  stars:   200,   
  starStep: 50,
  heading: 100,  
  wordStep: 50,
  para:    300,   
  descs:   400,   
  descStep: 80,
  names:   500,    
  nameStep: 80,
  desigs:  580,   
  desigStep: 80,
}

const TestimonialSec = () => {
  const sectionRef   = useRef(null)
  const centerImgRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const set = (el, styles) => Object.assign(el.style, styles)
    const animateIn = (el, styles, delay = 0) => setTimeout(() => Object.assign(el.style, styles), delay)


    const centerImg = centerImgRef.current
    if (centerImg) {
      set(centerImg, {
        transform:  'scale(0.6) rotate(-15deg) translateY(60px)',
        opacity:    '0',
        transition: 'none',
        willChange: 'transform, opacity',
      })
    }

    const mainHeading = section.querySelector('.side-1 h2')
    let wordSpans = []
    if (mainHeading) {
      const words = (mainHeading.textContent || '').split(' ')
      mainHeading.innerHTML = words.map(w =>
        `<span style="display:inline-block;overflow:hidden;vertical-align:bottom;line-height:1.1">` +
        `<span class="_wi" style="display:inline-block;will-change:transform,opacity">${w}</span></span>`
      ).join(' ')
      wordSpans = [...mainHeading.querySelectorAll('._wi')]
      wordSpans.forEach(w => set(w, { transform: 'translateY(105%)', opacity: '0', transition: 'none' }))
    }

    const mainPara = section.querySelector('.main-para')
    if (mainPara) set(mainPara, { transform: 'translateY(24px)', opacity: '0', filter: 'blur(5px)', transition: 'none', willChange: 'transform, opacity' })

    const boxes = [...section.querySelectorAll('.testi-box')]
    boxes.forEach((box, i) => {
      set(box, {
        transform:  `translateX(${i % 2 === 0 ? -60 : 60}px) translateY(20px)`,
        opacity:    '0',
        transition: 'none',
        willChange: 'transform, opacity',
      })
    })

    const stars = [...section.querySelectorAll('.star-box svg')]
    stars.forEach(star => set(star, { transform: 'scale(0) rotate(-30deg)', opacity: '0', transition: 'none', display: 'inline-block', willChange: 'transform, opacity' }))

    const descs = [...section.querySelectorAll('.testi-desc')]
    descs.forEach(d => set(d, { transform: 'translateY(12px)', opacity: '0', transition: 'none', willChange: 'transform, opacity' }))

    const names = [...section.querySelectorAll('.name')]
    names.forEach(n => set(n, { transform: 'translateY(8px)', opacity: '0', transition: 'none', willChange: 'transform, opacity' }))

    const desigs = [...section.querySelectorAll('.desig')]
    desigs.forEach(d => set(d, { transform: 'translateY(6px)', opacity: '0', transition: 'none', willChange: 'transform, opacity' }))


    let animated = false

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || animated) return
          animated = true

          if (centerImg) {
            animateIn(centerImg, {
              transition: `transform 1.6s ${EASE_BOUNCE}, opacity 1.2s ease`,
              transform:  'scale(1) rotate(0deg) translateY(0px)',
              opacity:    '1',
            }, T.image)
          }

          wordSpans.forEach((w, i) => {
            animateIn(w, {
              transition: `transform 0.7s ${EASE_SMOOTH}, opacity 0.7s ease`,
              transform:  'translateY(0%)',
              opacity:    '1',
            }, T.heading + i * T.wordStep)
          })

          if (mainPara) {
            animateIn(mainPara, {
              transition: `transform 0.9s ${EASE_SMOOTH}, opacity 0.9s ease, filter 0.9s ease`,
              transform:  'translateY(0px)',
              opacity:    '1',
              filter:     'blur(0px)',
            }, T.para)
          }

          boxes.forEach((box, i) => {
            animateIn(box, {
              transition: `transform 1s ${EASE_SMOOTH}, opacity 1s ease`,
              transform:  'translateX(0px) translateY(0px)',
              opacity:    '1',
            }, T.boxes + i * T.boxStep)
          })

          stars.forEach((star, i) => {
            animateIn(star, {
              transition: `transform 0.45s ${EASE_BOUNCE}, opacity 0.45s ease`,
              transform:  'scale(1) rotate(0deg)',
              opacity:    '1',
            }, T.stars + i * T.starStep)
          })

          descs.forEach((d, i) => {
            animateIn(d, {
              transition: `transform 0.7s ${EASE_SMOOTH}, opacity 0.7s ease`,
              transform:  'translateY(0px)',
              opacity:    '1',
            }, T.descs + i * T.descStep)
          })

          names.forEach((n, i) => {
            animateIn(n, {
              transition: `transform 0.6s ${EASE_SMOOTH}, opacity 0.6s ease`,
              transform:  'translateY(0px)',
              opacity:    '1',
            }, T.names + i * T.nameStep)
          })

          desigs.forEach((d, i) => {
            animateIn(d, {
              transition: `transform 0.6s ${EASE_SMOOTH}, opacity 0.6s ease`,
              transform:  'translateY(0px)',
              opacity:    '1',
            }, T.desigs + i * T.desigStep)
          })
        })
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    )

    observer.observe(section)


    boxes.forEach((box) => {
      box.addEventListener('mouseenter', () => {
        box.style.transition = `transform 0.4s ${EASE_SMOOTH}`
        box.style.transform  = 'translateX(0px) translateY(-8px)'
      })
      box.addEventListener('mouseleave', () => {
        box.style.transition = `transform 0.5s ${EASE_SMOOTH}`
        box.style.transform  = 'translateX(0px) translateY(0px)'
      })
    })

    const userImgs = [...section.querySelectorAll('.user-box img')]
    userImgs.forEach((img) => {
      img.addEventListener('mouseenter', () => {
        img.style.transition = `transform 0.35s ${EASE_BOUNCE}`
        img.style.transform  = 'scale(1.15)'
      })
      img.addEventListener('mouseleave', () => {
        img.style.transition = `transform 0.4s ${EASE_SMOOTH}`
        img.style.transform  = 'scale(1)'
      })
    })

    return () => observer.disconnect()

  }, [])

  return (
    <section className='testi-sec' ref={sectionRef}>
      <div className="container">
        <div className="row">
          <div className="col-md-5">
            <div className="side side-1">
              <div>
                <h2>Make Everything Change With Our</h2>
                <p className='main-para'>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud ...</p>
              </div>
              <div className="testi-box testi-box1">
                <div className="star-box"><FaStar /><FaStar /><FaStar /><FaStar /></div>
                <p className="testi-desc">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accu- santium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto.</p>
                <div className="testi-bottom">
                  <div className="user-box">
                    <img src="/images/testi-1.webp" alt="testi image" />
                    <div className="desc-box">
                      <h5 className="name">Egi Dasfara</h5>
                      <h6 className="desig">Client</h6>
                    </div>
                  </div>
                  <img className='colon' src="/images/colons.png" alt="" />
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-2">
            <img ref={centerImgRef} src="/images/testi-img.webp" alt="" className='center-img' />
          </div>

          <div className="col-md-5">
            <div className="side side-2">
              <div className="testi-box testi-box2">
                <div className="star-box"><FaStar /><FaStar /><FaStar /><FaStar /></div>
                <p className="testi-desc">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accu- santium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto.</p>
                <div className="testi-bottom">
                  <div className="user-box">
                    <img src="/images/testi-2.webp" alt="testi image" />
                    <div className="desc-box">
                      <h5 className="name">Egi Dasfara</h5>
                      <h6 className="desig">Client</h6>
                    </div>
                  </div>
                  <img className='colon' src="/images/colons.png" alt="" />
                </div>
              </div>
              <div className="testi-box testi-box3">
                <div className="star-box"><FaStar /><FaStar /><FaStar /><FaStar /></div>
                <p className="testi-desc">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accu- santium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto.</p>
                <div className="testi-bottom">
                  <div className="user-box">
                    <img src="/images/testi-3.webp" alt="testi image" />
                    <div className="desc-box">
                      <h5 className="name">Egi Dasfara</h5>
                      <h6 className="desig">Client</h6>
                    </div>
                  </div>
                  <img className='colon' src="/images/colons.png" alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TestimonialSec