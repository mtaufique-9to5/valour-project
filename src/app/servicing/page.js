"use client"
import React, { useEffect, useRef } from 'react';
import SplitType from 'split-type';
import AOS from 'aos';
import 'aos/dist/aos.css';
import "./servicing.css"
import "../about/about.css"
import Header from '@/components/Header';
import BeliefSec from '@/components/BeliefSec';
import PageTransition from '@/components/PageTransition';
import ScrollProvider from '@/components/ScrollProvider';
import Footer from '@/components/Footer';

const ServicingPage = () => {
    const heroSectionRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Initialize AOS
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: false,
            mirror: false,
        });

        // ===========================
        // SPLIT TEXT SETUP
        // ===========================
        const heroSubtitle = new SplitType('.p-sub', { types: 'chars' });
        const heroTitle = new SplitType('.p-hd', { types: 'words,chars' });

        // Wrap title words for line breaks
        const titleWords = document.querySelectorAll('.p-hd .word');
        titleWords.forEach(word => {
            word.style.overflow = 'hidden';
            word.style.display = 'inline-block';
        });

        // Section titles
        const sectionTitles = document.querySelectorAll('.section-title');
        sectionTitles.forEach(title => {
            const split = new SplitType(title, { types: 'words,chars' });
            split.chars?.forEach((char) => {
                char.style.display = 'inline-block';
                char.style.overflow = 'hidden';
            });
        });

        // ===========================
        // INITIAL STATES
        // ===========================
        // Hero subtitle - chars from left
        heroSubtitle.chars?.forEach((char) => {
            char.style.display = 'inline-block';
            char.style.opacity = '0';
            char.style.transform = 'translateX(-20px) rotateY(-90deg)';
            char.style.transformOrigin = 'left center';
        });

        // Hero title - chars from bottom
        heroTitle.chars?.forEach((char) => {
            char.style.display = 'inline-block';
            char.style.opacity = '0';
            char.style.transform = 'translateY(40px) rotateX(90deg)';
            char.style.transformOrigin = 'center bottom';
        });

        // Hero image and paragraph
        const heroImg = document.querySelector('.p-sec .abt-img');
        const heroPara = document.querySelector('.p-sec p');
        if (heroImg) {
            heroImg.style.opacity = '0';
            heroImg.style.transform = 'scale(0.7) rotateY(-15deg)';
            heroImg.style.filter = 'blur(12px) brightness(0.8)';
        }
        if (heroPara) {
            heroPara.style.opacity = '0';
            heroPara.style.transform = 'translateY(30px)';
            heroPara.style.filter = 'blur(8px)';
        }

        // Section images and content
        const sectionImages = document.querySelectorAll('.section-image');
        const sectionLabels = document.querySelectorAll('.section-label');
        const sectionTexts = document.querySelectorAll('.section-text');
        const bulletItems = document.querySelectorAll('.bullet-item');

        sectionImages.forEach((img) => {
            img.style.opacity = '0';
            img.style.transform = 'scale(0.85) rotateY(-10deg)';
            img.style.filter = 'blur(12px)';
        });

        sectionLabels.forEach((label) => {
            label.style.display = 'inline-block';
            label.style.opacity = '0';
            label.style.transform = 'translateY(40px) rotateX(90deg)';
            label.style.transformOrigin = 'center bottom';
        });

        sectionTexts.forEach((text) => {
            text.style.opacity = '0';
            text.style.transform = 'translateY(20px)';
            text.style.filter = 'blur(8px)';
        });

        bulletItems.forEach((item) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-15px)';
            item.style.filter = 'blur(6px)';
        });

        // ===========================
        // INTERSECTION OBSERVER
        // ===========================
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px',
        };

        // Hero section observer
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Subtitle chars reveal
                    heroSubtitle.chars?.forEach((char, i) => {
                        setTimeout(() => {
                            char.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            char.style.opacity = '1';
                            char.style.transform = 'translateX(0) rotateY(0deg)';
                        }, i * 30);
                    });

                    // Title chars reveal
                    heroTitle.chars?.forEach((char, i) => {
                        setTimeout(() => {
                            char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
                            char.style.opacity = '1';
                            char.style.transform = 'translateY(0) rotateX(0deg)';
                        }, i * 35 + 200);
                    });

                    // Hero image
                    if (heroImg) {
                        setTimeout(() => {
                            heroImg.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                            heroImg.style.opacity = '1';
                            heroImg.style.transform = 'scale(1) rotateY(0deg)';
                            heroImg.style.filter = 'blur(0px) brightness(1)';
                        }, 600);
                    }

                    // Hero paragraph
                    if (heroPara) {
                        setTimeout(() => {
                            heroPara.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                            heroPara.style.opacity = '1';
                            heroPara.style.transform = 'translateY(0)';
                            heroPara.style.filter = 'blur(0px)';
                        }, 400);
                    }

                    heroObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const heroSection = document.querySelector('.p-sec');
        if (heroSection) {
            heroObserver.observe(heroSection);
        }

        // Section content observer
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Label
                    const label = entry.target.querySelector('.section-label');
                    if (label) {
                        setTimeout(() => {
                            label.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            label.style.opacity = '1';
                            label.style.transform = 'translateX(0)';
                            label.style.filter = 'blur(0px)';
                        }, 0);
                    }

                    // Title chars
                    const titleElement = entry.target.querySelector('.section-title');
                    if (titleElement) {
                        const chars = titleElement.querySelectorAll('.char');
                        chars.forEach((char, i) => {
                            setTimeout(() => {
                            char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
                            char.style.opacity = '1';
                            char.style.transform = 'translateY(0) rotateX(0deg)';
                        }, i * 35 + 200);
                        });
                    }

                    // Text content
                    const texts = entry.target.querySelectorAll('.section-text');
                    texts.forEach((text, i) => {
                        setTimeout(() => {
                            text.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
                            text.style.opacity = '1';
                            text.style.transform = 'translateY(0)';
                            text.style.filter = 'blur(0px)';
                        }, i * 100 + 300);
                    });

                    // Bullet items
                    const bullets = entry.target.querySelectorAll('.bullet-item');
                    bullets.forEach((bullet, i) => {
                        setTimeout(() => {
                            bullet.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                            bullet.style.opacity = '1';
                            bullet.style.transform = 'translateX(0)';
                            bullet.style.filter = 'blur(0px)';
                        }, i * 80 + 400);
                    });

                    // Image
                    const img = entry.target.querySelector('.section-image');
                    if (img) {
                        setTimeout(() => {
                            img.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                            img.style.opacity = '1';
                            img.style.transform = 'scale(1) rotateY(0deg)';
                            img.style.filter = 'blur(0px)';
                        }, 200);
                    }

                    sectionObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -100px 0px' });

        // Observe all sections
        const sections = document.querySelectorAll('.section-warranty, .section-shipping, .section-returns');
        sections.forEach(section => {
            sectionObserver.observe(section);
        });

        return () => {
            heroObserver.disconnect();
            sectionObserver.disconnect();
        };
    }, []);

    return (
        <>
            <Header />
              <PageTransition />
              <ScrollProvider>
                {/* Section 1: Hero */}
                <div className="snap-section">
                <section className='s-sec'>
                    <div className="container">
                        <div className="row">
                            <div className="col-md-6">
                                <h5 className="s-sub">Services</h5>
                                <h1 className='s-hd'>TIMEPIECE<br></br> SERVICING</h1>
                                <p>At Valour, every timepiece deserves exceptional care. Our servicing solutions are designed to preserve the precision, performance, and longevity of your watch, ensuring a seamless and trusted experience throughout its lifetime.</p>
                            </div>
                            <div className="col-md-6">
                            </div>
                        </div>
                    </div>
                </section>
                </div>

                {/* Section 2: Warranty */}
                <div className="snap-section">
                <section className="section-warranty">
                    <div className="container">
                        <div className="section-inner">
                            <div className="section-text-side">
                                <span className="section-label">MAINTENANCE</span>
                                <h2 className="section-title">Routine Service</h2>
                                <p className="section-text">
                                   A mechanical watch is a living instrument. Regular servicing keeps your Valour timepiece running at peak precision, preserving both its performance and its value over time.
                                </p>
                                <p className="section-text">
                                    Our master watchmakers disassemble, clean, lubricate, and reassemble every movement by hand at our certified atelier. Full service intervals are recommended every 3 to 5 years depending on usage and model.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Complete movement disassembly and ultrasonic cleaning
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Lubrication of all gear trains and escapements
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Timing regulation and chronometric calibration
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                       Gasket replacement and water resistance testing
                                    </li>
                                </ul>
                            </div>
                            <div className="section-img-side">
                                <img
                                    src="/images/servicing-1.webp"
                                    alt="Watch movement"
                                    className="img-fluid section-image w-img"
                                />
                            </div>
                        </div>
                    </div>
                </section>
                </div>

                {/* Section 3: Shipping */}
                <div className="snap-section">
                <section className="section-shipping">
                    <div className="container">
                        <div className="section-inner">
                            <div className="section-text-side">
                                <span className="section-label">RESTORATION</span>
                                <h2 className="section-title">Repair & Restoration</h2>
                                <p className="section-text">
                                   From a damaged crystal to a worn crown, every component of your Valour deserves the same craftsmanship it was built with. We restore with precision — nothing less.
                                </p>
                                <p className="section-text">
                                   Our atelier handles everything from minor repairs to full mechanical overhauls. Genuine Valour parts are used exclusively, ensuring your timepiece retains its original character and integrity.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Crystal replacement and case refinishing
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                       Crown, pusher, and stem repair
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Bracelet and clasp restoration
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Movement parts replacement with genuine components
                                    </li>
                                </ul>
                            </div>
                            <div className="section-img-side">
                                <img
                                    src="/images/servicing-2.webp"
                                    alt="Premium packaging"
                                    className="img-fluid section-image s-img"
                                />
                            </div>

                        </div>
                    </div>
                </section>
                </div>

                {/* Section 4: Returns */}
                <div className="snap-section">
                <section className="section-returns">
                    <div className="container">
                        <div className="section-inner">
                            <div className="section-text-side">
                                <span className="section-label">BOOKING</span>
                                <h2 className="section-title">Book Appointment</h2>
                                <p className="section-text">
                                    Servicing your Valour is simple and fully supported. Ship your timepiece to us or visit an authorized service partner in your region. Every service includes a post-repair report and a 12-month service warranty.
                                </p>
                                <p className="section-text">
                                Turnaround times vary by service type. Routine calibrations are completed within 5 to 7 business days. Full overhauls and restorations may take 3 to 6 weeks depending on parts availability.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Free assessment and service quote provided upfront
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                      Fully insured and tracked return shipping included
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        12-month warranty on all service and repair work
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Secure online service request form available 24/7
                                    </li>
                                </ul>
                            </div>
                            <div className="section-img-side">
                                <img
                                    src="/images/servicing-3.webp"
                                    alt="Timepiece examination"
                                    className="section-image img-fluid"
                                />
                            </div>
                        </div>
                    </div>
                </section>
                </div>

                {/* Section 5: Belief Banner */}
                <div className="snap-section">
                <BeliefSec />
                </div>

                <div className="snap-section">
                <Footer />
                </div>
                </ScrollProvider>
        </>
    );
};

export default ServicingPage;