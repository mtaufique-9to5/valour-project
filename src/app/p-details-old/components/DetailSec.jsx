"use client";
import { useEffect, useRef } from "react";
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function NovaRedHero() {
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

    return (
        <section className="nova-section" ref={sectionRef}>
            <div className="container">
                <div className="row">
                    {/* Left Column: Text Content */}
                    <div className="col-12 col-lg-4 col-md-6 nova-text-col">
                        <h2 className="sm-title" data-reveal>
                            {splitWords("Nova Red")}
                        </h2>
                        <p className="desc"
                            ref={(el) => {
                                if (el) paragraphRefs.current[0] = el;
                            }}
                        >
                            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium
                        </p>
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
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[3] = el;
                                            }}
                                        >Case Material</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[4] = el;
                                            }}
                                        >Titanium</td>
                                    </tr>
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[5] = el;
                                            }}
                                        >Case Diameter</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[6] = el;
                                            }}
                                        >40mm</td>
                                    </tr>
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[7] = el;
                                            }}
                                        >Case Thickness</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[8] = el;
                                            }}
                                        >11.2mm</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Watch Images */}
                    <div className="col-12 col-lg-8 col-md-6 nova-image-col" data-reveal>
                        <div className="row">
                            <div className="col-md-6">
                                <img
                                    ref={imgRef}
                                    src="/images/nova-sec-img-1.png"
                                    alt="Nova Red Watch"
                                />
                            </div>
                            <div className="col-md-6">
                                <img
                                    ref={imgRef2}
                                    src="/images/nova-sec-img-2.png"
                                    alt="Nova Red Watch Detail"
                                    className="watch-2"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}