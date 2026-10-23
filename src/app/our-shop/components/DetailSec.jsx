"use client";
import { useEffect, useRef } from "react";
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function NovaRedHero({ product }) {
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

    // Intro section of the product page: heading, paragraph, spec table and two
    // images, all from the product (admin: "Intro"). Empty parts are not rendered.
    const intro = product.pdp?.intro ?? {}
    const left = product.sectionImages?.introLeft
    const right = product.sectionImages?.introRight
    const specs = intro.specs ?? []
    const hasText = intro.heading || intro.text || specs.length > 0

    return (
        <section className="nova-section" ref={sectionRef}>
            <div className="container">
                <div className="row">
                    {/* Left Column: Text Content */}
                    {hasText && (
                    <div className="col-12 col-lg-4 col-md-6 nova-text-col">
                        {intro.heading && (
                        <h2 className="sm-title" data-reveal>
                            {splitWords(intro.heading)}
                        </h2>
                        )}
                        {intro.text && (
                        <p className="desc"
                            ref={(el) => {
                                if (el) paragraphRefs.current[0] = el;
                            }}
                        >{intro.text}</p>
                        )}
                        {specs.length > 0 && (
                        <div data-reveal>
                            <table className="nova-table">
                                <thead>
                                    <tr>
                                        <th
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[1] = el;
                                            }}
                                        >Feature</th>
                                        <th
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[2] = el;
                                            }}
                                        >Specification</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {specs.map((row, i) => (
                                    <tr key={`${row.label}-${i}`}>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[3 + i * 2] = el;
                                            }}
                                        >{row.label}</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[4 + i * 2] = el;
                                            }}
                                        >{row.value}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                    )}

                    {/* Right Column: Watch Images */}
                    {(left || right) && (
                    <div className="col-12 col-lg-8 col-md-6 nova-image-col" data-reveal>
                        <div className="row">
                            {left && (
                            <div className="col-md-6">
                                <img
                                    ref={imgRef}
                                    src={left}
                                    alt={product.name}
                                    width={479}
                                    height={675}
                                />
                            </div>
                            )}
                            {right && (
                            <div className="col-md-6">
                                <img
                                    ref={imgRef2}
                                    src={right}
                                    alt={`${product.name}, detail`}
                                    className="watch-2"
                                />
                            </div>
                            )}
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </section>
    );
}