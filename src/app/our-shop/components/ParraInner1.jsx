"use client";

import { useEffect, useRef } from "react";


// Text of a parallax section: `section` is "parallax1" or "parallax2" (admin:
// Product page → Parallax 1 / Parallax 2). An empty heading or paragraph is not rendered.
export default function RM7501Hero({ product, section = "parallax1" }) {
  const content = product?.pdp?.[section] ?? {}
  const sectionRef = useRef(null);
  const paragraphRefs = useRef([]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

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

    const revealTargets = node.querySelectorAll("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            // remove so it re-plays every time it scrolls back into view
            entry.target.classList.remove("is-visible");
          }

          paragraphRefs.current.forEach((el, index) => {
            if (!el) return;

            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, 300 + index * 150); // stagger effect
          });
        });
      },
      { threshold: 0.35 }, observerOptions
    );

    revealTargets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // split a string into word-spans so each word can reveal with its own delay
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
    <section className="rm-hero parra-sec-1" ref={sectionRef}>
      <div className="rm-hero__scrim" />

      <div className="container rm-hero__grid">
        <div className="row h-100 align-items-end gx-0 justify-content-end">
          {/* Text column */}
          <div className="col-12 col-md-7 col-lg-6 order-2 order-md-1">
            <div className="rm-hero__text">
              {content.heading && (
              <h2 className="big-title" data-reveal>
                {splitWords(content.heading)}
              </h2>
              )}
              {content.text && (
              <p className="desc"
                ref={(el) => {
                  if (el) paragraphRefs.current[0] = el;
                }}
              >
                {content.text}
              </p>
              )}
            </div>
          </div>

          {/* Watch image column */}
          {/* <div className="col-12 col-md-5 col-lg-6 order-1 order-md-2">

          </div> */}
        </div>
      </div>

      <button className="rm-scroll-indicator" aria-label="Scroll down">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M4 8 L12 16 L20 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  );
}