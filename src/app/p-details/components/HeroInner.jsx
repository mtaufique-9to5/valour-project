"use client";
import Link from 'next/link'
import { useEffect, useRef } from "react";


export default function RM7501Hero() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const revealTargets = node.querySelectorAll("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.35 }
    );

    revealTargets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
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

  return (
    <section className="rm-hero" ref={sectionRef}>
      <div className="rm-hero__scrim" />

      <div className="container rm-hero__grid position-relative">
        <div className="row h-100 align-items-end gx-0">
          {/* Text column */}
          <div className="col-12 col-md-7 col-lg-6 order-2 order-md-1">
            <div className="rm-hero__text">
              <h1 className="big-title" data-reveal>
                {splitWords("Nova Red")}
              </h1>
              <p className="rm-subtitle" data-reveal>
                {splitWords("Flying Tourbillon Sapphire")}
              </p>
               <Link href="/cart" className='theme-btn'>Add to Cart</Link>
            </div>
          </div>

          {/* Watch image column */}
          <div className="col-12 col-md-5 col-lg-6 order-1 order-md-2">
            
          </div>
        </div>
      <button className="rm-scroll-indicator" aria-label="Scroll down">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M4 8 L12 16 L20 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      </div>

    </section>
  );
}