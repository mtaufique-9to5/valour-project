"use client";
import { useEffect, useRef } from "react";
import AOS from 'aos'
import 'aos/dist/aos.css'

const StrapSec = ({ product }) => {
  const imgRef = useRef(null)
  const imgRef2 = useRef(null)
  const sectionRef = useRef(null);
  const paragraphRefs = useRef([]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (typeof window === 'undefined') return

    const revealTargets = node.querySelectorAll("[data-reveal]");


    // Initialize AOS
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      mirror: false,
    })

    const section = sectionRef.current
    if (!section) return




    // Image - scale, rotate, blur
    if (imgRef.current) {
      imgRef.current.style.opacity = '0'
      imgRef.current.style.transform = 'scale(0.7) rotateY(-15deg) rotateX(10deg) translateZ(0)'
      imgRef.current.style.filter = 'blur(12px) brightness(0.8)'
    }
    if (imgRef2.current) {
      imgRef2.current.style.opacity = '0'
      imgRef2.current.style.transform = 'scale(0.7) rotateY(-15deg) rotateX(10deg) translateZ(0)'
      imgRef2.current.style.filter = 'blur(12px) brightness(0.8)'
    }

    paragraphRefs.current.forEach((el) => {
      if (!el) return;

      el.style.opacity = "0";
      el.style.transform = "translateY(40px)";
      el.style.transition =
        "opacity 0.8s ease, transform 0.8s ease";
    });

    // ===========================
    // INTERSECTION OBSERVER
    // ===========================
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    }


    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            // remove so it re-plays every time it scrolls back into view
            entry.target.classList.remove("is-visible");
          }

          if (entry.isIntersecting) {



            // Image - premium entrance with parallax simulation
            if (imgRef.current) {
              setTimeout(() => {
                imgRef.current.style.transition = 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                imgRef.current.style.opacity = '1'
                imgRef.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg) translateZ(0)'
                imgRef.current.style.filter = 'blur(0px) brightness(1)'
              }, 300)


              imgRef.current.addEventListener('mouseleave', () => {
                imgRef.current.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                imgRef.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg)'
                imgRef.current.style.filter = 'blur(0px) brightness(1)'
              })
            }
            if (imgRef2.current) {
              setTimeout(() => {
                imgRef2.current.style.transition = 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                imgRef2.current.style.opacity = '1'
                imgRef2.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg) translateZ(0)'
                imgRef2.current.style.filter = 'blur(0px) brightness(1)'
              }, 300)


              imgRef2.current.addEventListener('mouseleave', () => {
                imgRef2.current.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                imgRef2.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg)'
                imgRef2.current.style.filter = 'blur(0px) brightness(1)'
              })
            }

            paragraphRefs.current.forEach((el, index) => {
              if (!el) return;

              setTimeout(() => {
                el.style.opacity = "1";
                el.style.transform = "translateY(0)";
              }, 300 + index * 150); // stagger effect
            });

            // Unobserve after animation completes
            observer.unobserve(section)
          }
        });
      },
      { threshold: 0.35 }, observerOptions
    )
    observer.observe(section)

    revealTargets.forEach((el) => observer.observe(el));




    // Cleanup
    return () => {
      observer.disconnect()
    }

  }, []);

  const splitWords = (text) =>
    text.split(" ").map((word, i) => (
      <span className="rm-word-mask" key={i}>
        <span
          className="rm-word"
          style={{ transitionDelay: `${i * 70}ms` }}
        >
          {word}
        </span>
      </span>
    ));
  // "About Strap" section (admin: Product page → About Strap). Empty parts are not rendered.
  const strap = product?.pdp?.strap ?? {}
  const left = product?.sectionImages?.strapLeft
  const right = product?.sectionImages?.strapRight

  return (
    <section className='strap-sec straps' ref={sectionRef}>
      <div className="container">
        {strap.heading && (
        <h2 className="sm-title" data-reveal>
          {splitWords(strap.heading)}
        </h2>
        )}
        {strap.text && (
        <p className="desc"
          ref={(el) => {
            if (el) paragraphRefs.current[0] = el;
          }}
        >{strap.text}</p>
        )}
        {(left || right) && (
        <div className="strap-box">
          {left && <img src={left} className='strap-left' alt="" ref={imgRef} />}
          {right && <img src={right} className='strap-right' alt="" ref={imgRef2} />}
        </div>
        )}
      </div>

    </section>
  )
}

export default StrapSec
