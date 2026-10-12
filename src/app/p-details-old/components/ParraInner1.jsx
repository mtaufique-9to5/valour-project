"use client";

import { useEffect, useRef } from "react";


export default function RM7501Hero() {
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
        <div className="row h-100 align-items-end gx-0">
          {/* Text column */}
          <div className="col-12 col-md-7 col-lg-6 order-2 order-md-1">
            <div className="rm-hero__text">
              <h2 className="big-title" data-reveal>
                {splitWords("Nova Red - Night")}
              </h2>
              <p className="desc"
                ref={(el) => {
                  if (el) paragraphRefs.current[0] = el;
                }}
              >
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
              </p>
            </div>
          </div>

          {/* Watch image column */}
          <div className="col-12 col-md-5 col-lg-6 order-1 order-md-2">

          </div>
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