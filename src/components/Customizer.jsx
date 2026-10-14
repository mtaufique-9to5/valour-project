"use client"
import React, { useEffect, useRef, useState } from 'react'
import SplitType from 'split-type'
import AOS from 'aos'
import 'aos/dist/aos.css'
import Image from 'next/image';
import { customizerOptions, DEFAULT_CUSTOM_OPTIONS } from '@/data/catalog';
import { useAddToCart } from '@/app/features/cart/useCartActions';


const { case: caseOptions, dial: dialOptions, strap: strapOptions } = customizerOptions;

const findImage = (options, id) => options.find((option) => option.id === id)?.image;


const Customizer = () => {
    const sectionRef = useRef(null)
    const imgContainerRef = useRef(null)
    const headingRef = useRef(null)
    const tabMainRef = useRef(null)
    const [selection, setSelection] = useState(DEFAULT_CUSTOM_OPTIONS);
    const addToCart = useAddToCart();

    // Option click: update the selection and show the option's name, as before.
    const selectOption = (key, option) => (e) => {
        e.preventDefault();
        setSelection((prev) => ({ ...prev, [key]: option.id }));
        document.getElementById('stepDescription').textContent = option.name;
    };


    useEffect(() => {
        if (typeof window === 'undefined') return

        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: false,
            mirror: false,
        })

        const section = sectionRef.current
        if (!section) return

        const headingSplit = new SplitType('.customizer-heading', { types: 'chars' })

        // ===========================
        // INITIAL STATES
        // ===========================
        headingSplit.chars?.forEach((char) => {
            char.style.display = 'inline-block'
            char.style.opacity = '0'
            char.style.transform = 'translateY(40px) rotateX(90deg)'
            char.style.transformOrigin = 'center bottom'
        })

        if (imgContainerRef.current) {
            imgContainerRef.current.style.opacity = '0'
            imgContainerRef.current.style.transform = 'scale(0.8) rotateY(-15deg) translateZ(0)'
            imgContainerRef.current.style.filter = 'blur(12px)'
        }

        if (tabMainRef.current) {
            tabMainRef.current.style.opacity = '0'
            tabMainRef.current.style.transform = 'translateY(40px)'
            tabMainRef.current.style.filter = 'blur(8px)'
        }

        const observerOptions = {
            threshold: 0.2,
            rootMargin: '0px 0px -80px 0px',
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    headingSplit.chars?.forEach((char, i) => {
                        setTimeout(() => {
                            char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
                            char.style.opacity = '1'
                            char.style.transform = 'translateY(0) rotateX(0deg)'
                        }, i * 35)
                    })

                    if (imgContainerRef.current) {
                        setTimeout(() => {
                            imgContainerRef.current.style.transition = 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            imgContainerRef.current.style.opacity = '1'
                            imgContainerRef.current.style.transform = 'scale(1) rotateY(0deg) translateZ(0)'
                            imgContainerRef.current.style.filter = 'blur(0px)'
                        }, 200)
                    }

                    if (tabMainRef.current) {
                        setTimeout(() => {
                            tabMainRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
                            tabMainRef.current.style.opacity = '1'
                            tabMainRef.current.style.transform = 'translateY(0)'
                            tabMainRef.current.style.filter = 'blur(0px)'
                        }, 400)
                    }

                    observer.unobserve(section)
                }
            })
        }, observerOptions)

        observer.observe(section)

        // Cleanup
        return () => {
            observer.disconnect()
            headingSplit.revert?.()
        }
    }, [])

    useEffect(() => {
        const tabs = document.querySelectorAll(".tab-pane");
        const navLinks = document.querySelectorAll("#stepTabs .nav-link");
        const range = document.getElementById("stepRange");
        const heading = document.getElementById("stepHeading");
        const description = document.getElementById("stepDescription");
        const next = document.getElementById("nextBtn");
        const prev = document.getElementById("prevBtn");

        const headings = [
            "1. Choose Your Case",
            "2. Choose Your Dial",
            "3. Choose Your Band"
        ];

        const descriptions = [
            "Case",
            "Dial",
            "Band"
        ];
        let current = 0;

        function updateUI(index = current) {

            current = index;

            tabs[current].classList.remove("show");
            tabs[current].style.opacity = '0';
            tabs[current].style.transform = 'translateX(20px)';

            setTimeout(() => {
                tabs.forEach(tab => tab.classList.remove("show", "active"));
                navLinks.forEach(link => link.classList.remove("active"));

                tabs[current].classList.add("show", "active");
                navLinks[current].classList.add("active");

                range.value = current;

                const percent = (current / (tabs.length - 1)) * 100;
                range.style.setProperty("--fill-percent", percent + "%");

                heading.textContent = headings[current];
                description.textContent = descriptions[current];

                tabs[current].style.opacity = '1';
                tabs[current].style.transform = 'translateX(0)';
                if (current === 0) {
                    prev.style.display = 'none';
                } else {
                    prev.style.display = 'inline-block';
                }

                // Next button
                if (current === tabs.length - 1) {
                    next.style.display = 'none';
                } else {
                    next.style.display = 'inline-block';
                }
            }, 150);
        }


        navLinks.forEach((tab, index) => {
            tab.addEventListener("click", () => {
                updateUI(index);
            });
        });
        next.onclick = () => {
            if (current < tabs.length - 1) {
                current++;
                updateUI();
            }
        };

        prev.onclick = () => {
            if (current > 0) {
                current--;
                updateUI();
            }
        };
        range.addEventListener("input", function () {
            updateUI(Number(this.value));
        });

        updateUI(0);


    }, [])

    return (
        <section className="customizer_sec" ref={sectionRef}>
            <div className="container-fluid">
                <div className="row align-items-center">

                    <div className="col-xs-12 col-sm-7 col-md-7 col-lg-7" ref={imgContainerRef}>
                        <div className="big_img">
                            <Image id="imgStrap" width={524} height={574} src={findImage(strapOptions, selection.strapId)} style={{ zIndex: 1 }} alt="Picture of the author" />
                            <Image id="imgCase"
                                width={524}
                                height={574}
                                src={findImage(caseOptions, selection.caseId)}
                                style={{ zIndex: 2 }}
                                alt="Picture of the author" />
                            <Image id="imgDial" width={524} height={574} src={findImage(dialOptions, selection.dialId)} style={{ zIndex: 3 }} alt="Picture of the author" />


                        </div>
                    </div>
                    <div className="col-xs-12 col-sm-5 col-md-5 col-lg-5">
                        <div className="tab_main" ref={tabMainRef}>
                            {/* <!-- Tabs --> */}
                            <ul className="nav nav-pills nav-justified mb-3" id="stepTabs">
                                <li className="nav-item"><button className="nav-link active" data-step="0">Case </button></li>
                                <li className="nav-item"><button className="nav-link" data-step="1">Dail </button></li>
                                <li className="nav-item"><button className="nav-link" data-step="2">Band </button></li>
                            </ul>
                            <div className="range_main">
                                {/* <!-- Range Slider --> */}
                                <div className="mb-2">
                                    <div className="range_heading">
                                        <h3 id="stepHeading" className="customizer-heading">1. Choose Your Case</h3>
                                        <p id="stepDescription">Silver Brushed</p>
                                    </div>
                                    {/* <input type="range" className="form-range" id="stepRange" min="0" max="2" step="1" value="0" /> */}
                                    <input
                                        type="range"
                                        className="form-range"
                                        id="stepRange"
                                        min="0"
                                        max="2"
                                        step="1"
                                        defaultValue={0}
                                    />

                                </div>
                                {/* <!-- Tab Content --> */}
                                <div className="tab-content">
                                    {/* <!-- case --> */}
                                    <div className="tab-pane fade show active" style={{ transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out' }}>
                                        <div className="salect_main">


                                            {caseOptions.map((caseItem) => (
                                                <div className={`salect select_1${selection.caseId === caseItem.id ? ' active' : ''}`} key={caseItem.id}>
                                                    <a
                                                        href="#"
                                                        className="case-option"
                                                        data-image={caseItem.image}
                                                        onClick={selectOption('caseId', caseItem)}
                                                    >
                                                        <Image
                                                            width={160}
                                                            height={150}
                                                            src={caseItem.image}
                                                            className="img-fluid"
                                                            alt={caseItem.name}
                                                        />

                                                        <p>{caseItem.name}</p>
                                                    </a>
                                                </div>
                                            ))}

                                        </div>
                                    </div>
                                    <div className="tab-pane fade">
                                        <div className="salect_main">
                                            {dialOptions.map((dial) => (
                                                <div className={`salect select_1${selection.dialId === dial.id ? ' active' : ''}`} key={dial.id}>
                                                    <a
                                                        href="#"
                                                        className="dial-option"
                                                        data-image={dial.image}
                                                        onClick={selectOption('dialId', dial)}
                                                    >
                                                        <Image
                                                            width={160}
                                                            height={150}
                                                            src={dial.image}
                                                            className="img-fluid"
                                                            alt={dial.name}
                                                        />

                                                        <p>{dial.name}</p>
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* <!-- band --> */}
                                    <div className="tab-pane fade">
                                        <div className="salect_main">

                                            {strapOptions.map((strap) => (
                                                <div className={`salect select_1${selection.strapId === strap.id ? ' active' : ''}`} key={strap.id}>
                                                    <a
                                                        href="#"
                                                        className="band-option"
                                                        data-image={strap.image}
                                                        onClick={selectOption('strapId', strap)}
                                                    >
                                                        <Image
                                                            src={strap.image}
                                                            width={160}
                                                            height={150}
                                                            className="img-fluid"
                                                            alt={strap.name}
                                                        />
                                                        <p>{strap.name}</p>
                                                    </a>
                                                </div>
                                            ))}

                                        </div>
                                    </div>
                                </div>
                                <div className="prev_next">
                                    <a href="javascript:void(0)" id="prevBtn">Prev</a>
                                    <a href="javascript:void(0)" id="nextBtn">Next</a>
                                </div>
                                <div className="addtocart">
                                    <button
                                        type="button"
                                        data-opens-cart
                                        onClick={() => addToCart({ kind: 'custom', productId: 'custom-watch', options: selection })}
                                    >
                                        Add To Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section >
    )
}

export default Customizer
