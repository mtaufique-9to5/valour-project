'use client'

import { useEffect, useRef } from 'react'

export default function FormSec() {
  const sectionRef = useRef(null)
  const imgColRef = useRef(null)
  const spotlightRef = useRef(null)
  const svgBorderRef = useRef(null)
  const formBoxRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const svg = svgBorderRef.current

    if (!section || !svg) return

    const listeners = []
    const timeouts = []
    const observers = []


    const easeOutExpo = 'cubic-bezier(0.16, 1, 0.3, 1)'
    const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)'

    const animate = (
      el,
      styles,
      {
        duration = 800,
        delay = 0,
        easing = easeOut,
      } = {}
    ) => {
      if (!el) return

      el.style.transition = `all ${duration}ms ${easing}`
      el.style.transitionDelay = `${delay}ms`

      requestAnimationFrame(() => {
        Object.entries(styles).forEach(([key, value]) => {
          el.style[key] = value
        })
      })
    }

    const observeOnce = (target, callback) => {
      const observer = new IntersectionObserver(
        ([entry], obs) => {
          if (!entry.isIntersecting) return

          callback()

          obs.unobserve(entry.target)
        },
        {
          threshold: 0.15,
          rootMargin: '0px 0px -10% 0px',
        }
      )

      observer.observe(target)
      observers.push(observer)
    }


    const imgCol = imgColRef.current

    if (imgCol) {
      imgCol.style.opacity = '0'
      imgCol.style.transform = 'translate3d(-460px,0,0)'

      observeOnce(section, () => {
        animate(
          imgCol,
          {
            opacity: '1',
            transform: 'translate3d(0,0,0)',
          },
          {
            duration: 1400,
            easing: easeOutExpo,
          }
        )
      })
    }

    const formBox = formBoxRef.current

    if (formBox) {
      formBox.style.opacity = '0'
      formBox.style.transform = 'translate3d(300px,0,0)'

      observeOnce(section, () => {
        animate(
          formBox,
          {
            opacity: '1',
            transform: 'translate3d(0px,0,0)',
          },
          {
            duration: 2200,
            easing: easeOutExpo,
          }
        )
      })
    }


    const h2 = section.querySelector('.form-heading')

    if (h2) {
      const words = (h2.textContent || '').split(' ')

      h2.innerHTML = words
        .map(
          (w) => `
            <span style="display:inline-block;overflow:hidden;vertical-align:bottom;line-height:1.1">
              <span class="_wi" style="display:inline-block;transform:translate3d(0,105%,0);opacity:0">
                ${w}
              </span>
            </span>
          `
        )
        .join(' ')

      const inner = h2.querySelectorAll('._wi')

      observeOnce(section, () => {
        inner.forEach((el, i) => {
          animate(
            el,
            {
              transform: 'translate3d(0,0%,0)',
              opacity: '1',
            },
            {
              duration: 800,
              delay: 1000 + i * 60,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }
          )
        })
      })
    }


    const para = formBox?.querySelector('p')

    if (para) {
      para.style.opacity = '0'
      para.style.transform = 'translate3d(0,16px,0)'

      observeOnce(section, () => {
        animate(
          para,
          {
            opacity: '1',
            transform: 'translate3d(0,0,0)',
          },
          {
            duration: 900,
            delay: 1000,
          }
        )
      })
    }


    const inputs = section.querySelectorAll('.input')

    inputs.forEach((input) => {
      input.style.opacity = '0'
      input.style.transform = 'translate3d(0,20px,0)'
    })

    observeOnce(section, () => {
      inputs.forEach((input, i) => {
        animate(
          input,
          {
            opacity: '1',
            transform: 'translate3d(0,0,0)',
          },
          {
            duration: 650,
            delay: 550 + i * 80,
          }
        )
      })
    })


    const spotlight = spotlightRef.current

    if (spotlight && imgCol) {
      spotlight.style.opacity = '0'
      spotlight.style.transform = 'translate3d(0,0,0)'

      let raf = null

      const moveSpotlight = (e) => {
        if (raf) cancelAnimationFrame(raf)

        raf = requestAnimationFrame(() => {
          const rect = imgCol.getBoundingClientRect()

          const x = e.clientX - rect.left
          const y = e.clientY - rect.top

          spotlight.style.transform = `translate3d(${x - 130}px, ${y - 130}px, 0)`
        })
      }

      const onEnter = () => {
        spotlight.style.transition = 'opacity 400ms ease'
        spotlight.style.opacity = '1'
      }

      const onLeave = () => {
        spotlight.style.transition = 'opacity 500ms ease'
        spotlight.style.opacity = '0'
      }

      imgCol.addEventListener('mousemove', moveSpotlight, {
        passive: true,
      })

      imgCol.addEventListener('mouseenter', onEnter)
      imgCol.addEventListener('mouseleave', onLeave)

      listeners.push(
        { el: imgCol, type: 'mousemove', fn: moveSpotlight },
        { el: imgCol, type: 'mouseenter', fn: onEnter },
        { el: imgCol, type: 'mouseleave', fn: onLeave }
      )
    }


    const textInputs = section.querySelectorAll(
      'input.input, textarea.input, select.input'
    )

    textInputs.forEach((input) => {
      input.style.willChange = 'transform, opacity'

      const wrapper = input.closest('[data-field]')
      const label = wrapper?.querySelector('[data-label]')

      const onFocus = () => {
        input.style.transition =
          'border-color 300ms ease, box-shadow .5s ease, transform 250ms ease'

        input.style.borderColor = 'rgba(255,255,255,0.85)'
        input.style.boxShadow =
          '0px 0px 15px 5px #ffffff63, 0 4px 24px rgba(255,255,255,0.06)'

        input.style.transform = 'scaleY(1.012)'

        if (label) {
          label.style.transition = 'all 280ms ease'
          label.style.transform = 'translate3d(0,-22px,0) scale(0.78)'
          label.style.opacity = '1'
          label.style.color = 'rgba(255,255,255,0.9)'
        }
      }

      const onBlur = () => {
        const hasValue = input.value?.trim() !== ''

        input.style.borderColor = hasValue
          ? 'rgba(255,255,255,0.6)'
          : 'rgba(255,255,255,0.57)'

        input.style.boxShadow = 'none'
        input.style.transform = 'scaleY(1)'

        if (label && !hasValue) {
          label.style.transform = 'translate3d(0,0,0) scale(1)'
          label.style.opacity = '0.45'
        }
      }

      const onKeydown = () => {
        input.style.borderColor = 'rgba(255,255,255,0.95)'

        clearTimeout(input.__borderTimeout)

        input.__borderTimeout = setTimeout(() => {
          input.style.borderColor = 'rgba(255,255,255,0.85)'
        }, 120)
      }

      const onInput = () => {
        input.animate(
          [
            { transform: 'translate3d(0,0,0)' },
            { transform: 'translate3d(1.5px,0,0)' },
            { transform: 'translate3d(0,0,0)' },
          ],
          {
            duration: 100,
            easing: 'ease-out',
          }
        )
      }

      input.addEventListener('focus', onFocus)
      input.addEventListener('blur', onBlur)
      input.addEventListener('keydown', onKeydown)
      input.addEventListener('input', onInput)

      listeners.push(
        { el: input, type: 'focus', fn: onFocus },
        { el: input, type: 'blur', fn: onBlur },
        { el: input, type: 'keydown', fn: onKeydown },
        { el: input, type: 'input', fn: onInput }
      )
    })



    const btn = section.querySelector('button[type=submit]')

    if (btn) {
      btn.style.transition =
        'transform 300ms ease, background-position 300ms ease'

      const onEnter = () => {
        btn.style.transform = 'scale(1.04)'
        btn.style.backgroundPosition = '100% 0%'
      }

      const onLeave = () => {
        btn.style.transform = 'scale(1)'
        btn.style.backgroundPosition = '0% 0%'
      }

      const onDown = () => {
        btn.style.transform = 'scale(0.96)'
      }

      const onUp = () => {
        btn.style.transform = 'scale(1.04)'
      }

      const shake = (el, delay = 0) => {
        const timeout = setTimeout(() => {
          el.animate(
            [
              { transform: 'translate3d(0,0,0)' },
              { transform: 'translate3d(-6px,0,0)' },
              { transform: 'translate3d(6px,0,0)' },
              { transform: 'translate3d(-4px,0,0)' },
              { transform: 'translate3d(4px,0,0)' },
              { transform: 'translate3d(0,0,0)' },
            ],
            {
              duration: 320,
              easing: 'ease-out',
            }
          )
        }, delay)

        timeouts.push(timeout)
      }

      const onSubmitClick = (e) => {
        e.preventDefault()

        const allInputs = [
          ...section.querySelectorAll(
            'input.input, textarea.input, select.input'
          ),
        ]

        let hasEmpty = false

        allInputs.forEach((inp, i) => {
          const empty = !inp.value || inp.value.trim() === ''

          if (empty) {
            hasEmpty = true

            shake(inp, i * 40)

            inp.style.borderColor = 'rgba(255,120,120,0.85)'
            inp.style.boxShadow = '0 0 14px rgba(255,80,80,0.18)'

            const timeout = setTimeout(() => {
              inp.style.borderColor = 'rgba(255,255,255,0.57)'
              inp.style.boxShadow = 'none'
            }, 1400)

            timeouts.push(timeout)
          } else {
            inp.style.transition =
              'border-color 250ms ease, box-shadow 250ms ease'

            const timeout1 = setTimeout(() => {
              inp.style.borderColor = 'rgba(255,255,255,0.9)'
              inp.style.boxShadow = '0 0 18px rgba(255,255,255,0.14)'
            }, i * 60)

            const timeout2 = setTimeout(() => {
              inp.style.borderColor = 'rgba(255,255,255,0.6)'
              inp.style.boxShadow = 'none'
            }, i * 60 + 400)

            timeouts.push(timeout1, timeout2)
          }
        })

        if (!hasEmpty && formBox) {
          formBox.animate(
            [
              { transform: 'scale(1)' },
              { transform: 'scale(1.008)' },
              { transform: 'scale(1)' },
            ],
            {
              duration: 360,
              easing: 'ease-out',
            }
          )
        }
      }

      btn.addEventListener('mouseenter', onEnter)
      btn.addEventListener('mouseleave', onLeave)
      btn.addEventListener('mousedown', onDown)
      btn.addEventListener('mouseup', onUp)
      btn.addEventListener('click', onSubmitClick)

      listeners.push(
        { el: btn, type: 'mouseenter', fn: onEnter },
        { el: btn, type: 'mouseleave', fn: onLeave },
        { el: btn, type: 'mousedown', fn: onDown },
        { el: btn, type: 'mouseup', fn: onUp },
        { el: btn, type: 'click', fn: onSubmitClick }
      )
    }


    const rect = svg.querySelector('.neon-rect')

    if (rect) {
      const len = rect.getTotalLength?.() || 900

      rect.style.strokeDasharray = len
      rect.style.strokeDashoffset = len
      rect.style.opacity = '1'

      observeOnce(section, () => {
        rect.style.transition =
          'stroke-dashoffset 1500ms ease-in-out 250ms'

        requestAnimationFrame(() => {
          rect.style.strokeDashoffset = '0'
        })

        const pulse = () => {
          rect.animate(
            [
              { opacity: 0.38 },
              { opacity: 1 },
              { opacity: 0.38 },
            ],
            {
              duration: 2500,
              iterations: Infinity,
              easing: 'ease-in-out',
            }
          )
        }

        const timeout = setTimeout(pulse, 2000)

        timeouts.push(timeout)
      })
    }

    // Cleanup
    return () => {
      listeners.forEach(({ el, type, fn }) => {
        el?.removeEventListener(type, fn)
      })

      observers.forEach((observer) => observer.disconnect())

      timeouts.forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  return (
    <>
      <section className='form-sec' ref={sectionRef}>
        <div className='container'>
          <div className='row'>

            {/* Image col with spotlight */}
            <div
              className='col-md-6 img-col'
              ref={imgColRef}
              style={{ position: 'relative' }}
            >
              <img src='/images/form-img.png' alt='' />

              <div
                ref={spotlightRef}
                className='form-spotlight'
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '260px',
                  height: '260px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255,255,255,0.11) 0%, transparent 68%)',
                  pointerEvents: 'none',
                  zIndex: 2,
                  opacity: 0,
                  willChange: 'transform, opacity',
                }}
              />
            </div>

            {/* Form col */}
            <div
              className='col-md-6'
              style={{ position: 'relative' }}
            >
              <svg
                ref={svgBorderRef}
                className='neon-border-svg'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <rect
                  className='neon-rect'
                  x='2'
                  y='2'
                  width='calc(100% - 4)'
                  height='calc(100% - 4)'
                  rx='12'
                  stroke='rgba(255,255,255,0.6)'
                  strokeWidth='1.5'
                />
              </svg>

              <div className='form-box' ref={formBoxRef}>
                <h2 className='form-heading'>
                  Here to Contact us Whenever you Need
                </h2>

                <p>
                  Lorem ipsum dolor sit amet, consectetur, sed do eiusmod
                  tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam quis nostrud ...
                </p>

                <form action=''>
                  <div className='row'>
                    <div className='col-md-6'>
                      <input
                        type='text'
                        className='input'
                        placeholder='Mark Hurt'
                      />
                    </div>

                    <div className='col-md-6'>
                      <input
                        type='email'
                        className='input'
                        placeholder='info@youremail.com'
                      />
                    </div>

                    <div className='col-md-6'>
                      <input
                        type='tel'
                        className='input'
                        placeholder='+1 236 598 9866'
                      />
                    </div>

                    <div className='col-md-6'>
                      <select className='input select' name='watch'>
                        <option value=''>Select a watch</option>
                        <option>Sunseeker Yellow</option>
                        <option>Midnight Blue</option>
                        <option>Forest Green</option>
                      </select>
                    </div>

                    <div className='col-md-12'>
                      <textarea
                        rows='4'
                        className='input'
                        placeholder='Your message here'
                      />

                      <button
                        type='submit'
                        className='form-submit-btn'
                      >
                        Submit Now
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>

  )
}