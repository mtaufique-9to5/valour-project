"use client"
import React, { useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import SplitType from 'split-type';
import AOS from 'aos';
import 'aos/dist/aos.css';
import "./p-policy.css"
import "../about/about.css"
import Header from '@/components/Header';
import BeliefSec from '@/components/BeliefSec';
import PageTransition from '@/components/PageTransition';
import ScrollProvider from '@/components/ScrollProvider';
import Footer from '@/components/Footer';

const PurchasePolicies = () => {
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
                <section className='p-sec'>
                    <div className="container">
                        <div className="row">
                            <div className="col-md-6">
                                <h5 className="p-sub">Policies</h5>
                                <h1 className='p-hd'>PURCHASE<br></br> POLICIES</h1>
                                <p>At Valour, every timepiece is crafted with precision and delivered with care. Our policies ensure a seamless, secure, and transparent experience from order to ownership.</p>
                            </div>
                            <div className="col-md-6">
                                <div className="img-box">
                                    <img src="/images/about-img.webp" alt="" className="abt-img" />
                                </div>
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
                                <span className="section-label">Protection</span>
                                <h2 className="section-title">Warranty Policy</h2>
                                <p className="section-text">
                                    Every Valour timepiece carries a comprehensive 24-month limited warranty from the date of original purchase. This covers manufacturing defects in materials and workmanship under normal use.
                                </p>
                                <p className="section-text">
                                    Our certified master watchmakers perform all warranty repairs exclusively at authorized service centers. Extended warranty options to 5 years are available at checkout.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Movement defects and calibration issues
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Case and crystal manufacturing flaws
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Bracelet and clasp hardware failures
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Water resistance seal integrity
                                    </li>
                                </ul>
                            </div>
                            <div className="section-img-side">
                                <img
                                    src="/images/testi-img.webp"
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
                                <span className="section-label">Logistics</span>
                                <h2 className="section-title">Shipping & Delivery</h2>
                                <p className="section-text">
                                    White-glove handling from our atelier to your wrist. Every shipment is fully insured, climate-controlled, and delivered with signature confirmation.
                                </p>
                                <p className="section-text">
                                    Domestic orders arrive within 3 to 5 business days. International delivery ranges from 5 to 10 business days through DHL Express or FedEx International Priority.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Complimentary domestic shipping on all orders
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Fully insured for full retail value
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Discreet, unmarked packaging standard
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Real-time tracking within 24 hours
                                    </li>
                                </ul>
                            </div>
                            <div className="section-img-side">
                                <img
                                    src="/images/form-img.png"
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
                                <span className="section-label">Satisfaction</span>
                                <h2 className="section-title">Returns & Refunds</h2>
                                <p className="section-text">
                                    We accept returns of unworn timepieces within 14 days of delivery. The item must be in its original condition with all protective films intact.
                                </p>
                                <p className="section-text">
                                    Customized or engraved timepieces are final sale. Pre-owned and limited edition items cannot be returned unless arriving with undisclosed defects.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        14-day return window from delivery date
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Prepaid insured return shipping label
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Refunds processed within 7 to 10 business days
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Original payment method credited
                                    </li>
                                </ul>
                            </div>
                            <div className="section-img-side">
                                <img
                                    src="/images/blue.png"
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

export default PurchasePolicies;