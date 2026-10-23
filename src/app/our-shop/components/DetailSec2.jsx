"use client";
import { useEffect, useRef } from "react";
import AOS from 'aos'
import 'aos/dist/aos.css'



export default function NovaRedHero({product}) {
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



    // "Movement" section of the product page: heading, paragraph, spec table and
    // image, all from the product (admin: "Movement"). Empty parts are not rendered.
    const sec = product.pdp?.movement ?? {}
    const specs = sec.specs ?? []
    const image = product.sectionImages?.movement
    const hasText = sec.heading || sec.text || specs.length > 0

    return (
        <section className="nova-section d-sec-2" ref={sectionRef}>

            <div className="container">
                <div className="row">
                    {/* Left Column: Text Content */}
                    {hasText && (
                    <div className="col-12 col-lg-6 col-md-6 nova-text-col">
                        {sec.heading && (
                        <h2 className="sm-title" data-reveal>
                            {splitWords(sec.heading)}
                        </h2>
                        )}
                        {sec.text && (
                        <p className="desc"
                            ref={(el) => {
                                if (el) paragraphRefs.current[0] = el;
                            }}
                        >
                            {sec.text}
                        </p>
                        )}
                        {specs.length > 0 && (
                        <div data-reveal>
                            <table className="nova-table">
                                <tbody>
                                    {specs.map((row, i) => (
                                    <tr key={`${row.label}-${i}`}>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[1 + i * 2] = el;
                                            }}
                                        >{row.label}</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[2 + i * 2] = el;
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
                    {image && (
                    <div className="col-12 col-lg-6 col-md-6">
                        <div className="img-sec" role="img" aria-label={`${product.name}, Movement`} style={{ backgroundImage: `url("${image}")` }}></div>
                    </div>
                    )}
                </div>
            </div>
        </section>
    );
}