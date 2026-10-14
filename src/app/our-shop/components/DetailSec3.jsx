"use client";
import { useEffect, useRef } from "react";
import AOS from 'aos'
import 'aos/dist/aos.css'




export default function NovaRedHero() {
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
        <section className="nova-section d-sec-2 sec-3" ref={sectionRef}>

            <div className="container">
                <div className="row">
                    {/* Left Column: Text Content */}
                    <div className="col-12 col-lg-6 col-md-6 nova-text-col">
                        <h2 className="sm-title" data-reveal>
                            {splitWords("Dial Finish")}
                        </h2>
                        <p className="desc"
                            ref={(el) => {
                                if (el) paragraphRefs.current[0] = el;
                            }}
                        >
                            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                        </p>
                        <div data-reveal>
                            <table className="nova-table">

                                <tbody>
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[1] = el;
                                            }}
                                        >Strap Material</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[2] = el;
                                            }}
                                        >Premium Textile Strap</td>
                                    </tr>
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[3] = el;
                                            }}
                                        >Crystal</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[4] = el;
                                            }}
                                        >Scratch-Resistant Sapphire</td>
                                    </tr>
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[5] = el;
                                            }}
                                        >Dial Finish</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[6] = el;
                                            }}
                                        >Sunburst Yellow</td>
                                    </tr>
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[7] = el;
                                            }}
                                        >Weight</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[8] = el;
                                            }}
                                        >78g</td>
                                    </tr>
                                    <tr>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[9] = el;
                                            }}
                                        >Warranty</td>
                                        <td
                                            ref={(el) => {
                                                if (el) paragraphRefs.current[10] = el;
                                            }}
                                        >5 Years International</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Watch Images */}
                    <div className="col-12 col-lg-6 col-md-6">
                        <div className="img-sec" style={{ backgroundImage: "url(/images/d-sec-3-img.jpg)" }}></div>
                    </div>
                </div>
            </div>
        </section>
    );
}