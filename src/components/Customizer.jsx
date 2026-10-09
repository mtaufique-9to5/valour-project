"use client"
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react'
import SplitType from 'split-type'
import AOS from 'aos'
import 'aos/dist/aos.css'
import Image from 'next/image';


const Customizer = () => {
    const sectionRef = useRef(null)
    const imgContainerRef = useRef(null)
    const headingRef = useRef(null)
    const tabMainRef = useRef(null)
    const [step, setStep] = useState(0);


    const dialOptions = [
        {
            name: "Black",
            image: "/images/customizer/dial/dial-black.png",
        },
        {
            name: "Light Blue",
            image: "/images/customizer/dial/diallightblue.png",
        },
        {
            name: "Mint",
            image: "/images/customizer/dial/dial-mint.png",
        },
        {
            name: "Navy Blue",
            image: "/images/customizer/dial/dial-navy-blue.png",
        },
        {
            name: "Orange",
            image: "/images/customizer/dial/dial-orange.png",
        },
        {
            name: "Purple",
            image: "/images/customizer/dial/dial-purple.png",
        },
        {
            name: "Red",
            image: "/images/customizer/dial/dial-red.png",
        },
        {
            name: "Silver",
            image: "/images/customizer/dial/dial-silver.png",
        },
        {
            name: "Teal",
            image: "/images/customizer/dial/dial-teal.png",
        },
        {
            name: "Yellow",
            image: "/images/customizer/dial/dial-yellow.png",
        },
    ];



    const strapOptions = [
        {
            name: "Black",
            image: "/images/customizer/straps/strap_black_black.png",
        },
        {
            name: "Black Grey",
            image: "/images/customizer/straps/strap_black_grey.png",
        },
        {
            name: "Black Silver",
            image: "/images/customizer/straps/strap_black_silver.png",
        },
        {
            name: "Grey Black",
            image: "/images/customizer/straps/strap_grey_black.png",
        },
        {
            name: "Grey Blue",
            image: "/images/customizer/straps/strap_grey_blue.png",
        },
        {
            name: "Grey",
            image: "/images/customizer/straps/strap_grey_grey.png",
        },
        {
            name: "Light Blue",
            image: "/images/customizer/straps/strap_grey_light_blue.png",
        },
        {
            name: "Grey Orange",
            image: "/images/customizer/straps/strap_grey_orange.png",
        },
        {
            name: "Grey Purple",
            image: "/images/customizer/straps/strap_grey_purple.png",
        },
        {
            name: "Grey Red",
            image: "/images/customizer/straps/strap_grey_red.png",
        },
        {
            name: "Grey Silver",
            image: "/images/customizer/straps/strap_grey_silver.png",
        },
        {
            name: "Grey Teal",
            image: "/images/customizer/straps/strap_grey_Teal.png",
        },
        {
            name: "Grey Yellow",
            image: "/images/customizer/straps/strap_grey_yellow.png",
        },
    ];


    const caseOptions = [
        {
            name: "Black",
            image: "/images/customizer/case/case-black.png",
        },
        {
            name: "Gold",
            image: "/images/customizer/case/case-dold.png",
        },
        {
            name: "Silver",
            image: "/images/customizer/case/case-silver.png",
        },
    ];

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


        const imgCase = document.getElementById("imgCase");
        const imgDial = document.getElementById("imgDial");
        const imgStrap = document.getElementById("imgStrap");

        // =====================
        // CASE
        // =====================

        document.querySelectorAll(".case-option").forEach(item => {

            item.addEventListener("click", function () {

                document.querySelectorAll(".case-option").forEach(el => {
                    el.closest(".salect").classList.remove("active");
                });

                this.closest(".salect").classList.add("active");

                imgCase.src = this.dataset.image;

                description.innerHTML = this.querySelector("p").innerHTML;

            });

        });


        // =====================
        // DIAL
        // =====================

        document.querySelectorAll(".dial-option").forEach(item => {

            item.addEventListener("click", function () {

                document.querySelectorAll(".dial-option").forEach(el => {
                    el.closest(".salect").classList.remove("active");
                });

                this.closest(".salect").classList.add("active");

                imgDial.src = this.dataset.image;

                description.innerHTML = this.querySelector("p").innerHTML;

            });

        });


        // =====================
        // BAND
        // =====================

        document.querySelectorAll(".band-option").forEach(item => {

            item.addEventListener("click", function () {

                document.querySelectorAll(".band-option").forEach(el => {
                    el.closest(".salect").classList.remove("active");
                });

                this.closest(".salect").classList.add("active");

                imgStrap.src = this.dataset.image;

                description.innerHTML = this.querySelector("p").innerHTML;

            });

        });


    }, [])

    return (
        <section className="customizer_sec" ref={sectionRef}>
            <div className="container-fluid">
                <div className="row align-items-center">

                    <div className="col-xs-12 col-sm-7 col-md-7 col-lg-7" ref={imgContainerRef}>
                        <div className="big_img">
                            <Image id="imgStrap" width={524} height={574} src="/images/customizer/straps/strap_black_black.png" style={{ zIndex: 1 }} alt="Picture of the author" />
                            <Image id="imgCase"
                                width={524}
                                height={574}
                                src="/images/customizer/case/case-black.png"
                                style={{ zIndex: 2 }}
                                alt="Picture of the author" />
                            <Image id="imgDial" width={524} height={574} src="/images/customizer/dial/dial-black.png" style={{ zIndex: 3 }} alt="Picture of the author" />


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
                                        value={step}
                                        onChange={(e) => setStep(Number(e.target.value))}
                                    />

                                </div>
                                {/* <!-- Tab Content --> */}
                                <div className="tab-content">
                                    {/* <!-- case --> */}
                                    <div className="tab-pane fade show active" style={{ transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out' }}>
                                        <div className="salect_main">


                                            {caseOptions.map((caseItem) => (
                                                <div className="salect select_1" key={caseItem.name}>
                                                    <a
                                                        href="#"
                                                        className="case-option"
                                                        data-image={caseItem.image}
                                                        onClick={(e) => e.preventDefault()}
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
                                                <div className="salect select_1" key={dial.name}>
                                                    <a
                                                        href="#"
                                                        className="dial-option"
                                                        data-image={dial.image}
                                                        onClick={(e) => e.preventDefault()}
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

                                            {strapOptions.map((strap, index) => (
                                                <div className="salect select_1" key={index}>
                                                    <a
                                                        href="#"
                                                        className="band-option"
                                                        data-image={strap.image}
                                                        onClick={(e) => e.preventDefault()}
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
                                    <Link href="/cart" >Add To Cart</Link>
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
