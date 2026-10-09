"use client"
import React, { useEffect, useRef } from 'react';
import SplitType from 'split-type';
import AOS from 'aos';
import 'aos/dist/aos.css';
import "./w-warranty.css"
import "../about/about.css"
import Header from '@/components/Header';
import BeliefSec from '@/components/BeliefSec';
import PageTransition from '@/components/PageTransition';
import ScrollProvider from '@/components/ScrollProvider';
import Footer from '@/components/Footer';

const WatchWarranty = () => {


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
        <div className='w-page'>
            <Header />
              <PageTransition />
              <ScrollProvider>
                {/* Section 1: Hero */}
                <div className="snap-section">
                <section className='w-sec'>
                    <div className="container">
                        <div className="row">
                            <div className="col-md-6">
                                <h5 className="w-sub">Policies</h5>
                                <h1 className='w-hd'>Watch <br/> Warranty</h1>
                                <p>At Valour, every timepiece leaves our atelier with the assurance of craftsmanship you can trust. Our warranty program reflects our commitment to precision, quality, and your complete peace of mind.</p>
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
                                <h2 className="section-title">Standard Warranty Coverage</h2>
                                <p className="section-text">
                                    Every Valour timepiece is protected by a comprehensive 24-month limited warranty from the date of original purchase. This coverage applies to manufacturing defects in materials and workmanship under normal conditions of use.
                                </p>
                                <p className="section-text">
                                    All warranty repairs are performed exclusively by our certified master watchmakers at authorized Valour service centers. We do not outsource — every repair is handled with the same hands that built it.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Movement defects and timekeeping irregularities
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                       Case and crystal manufacturing flaws
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Crown, pusher, and stem mechanical failures
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Bracelet and clasp hardware defects
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
                                <span className="section-label">EXTENDED COVERAGE</span>
                                <h2 className="section-title">Extended Warranty Program</h2>
                                <p className="section-text">
                                   For collectors who demand the highest level of long-term protection, Valour offers an Extended Warranty upgrade available at the time of purchase or within 30 days of your original order.
                                </p>
                                <p className="section-text">
                                  Extended coverage stretches your protection to a full 5 years, covering all standard warranty items plus priority servicing and complimentary annual regulation checks at no additional cost.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Extended coverage up to 5 years from purchase date
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                       Priority turnaround — service completed within 5 business days
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                       Complimentary annual timing regulation included
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        One complimentary crystal replacement over coverage period
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
                                <span className="section-label">EXCLUSIONS</span>
                                <h2 className="section-title">What Is Not Covered</h2>
                                <p className="section-text">
                                    Our warranty is comprehensive, but certain conditions fall outside its scope. Understanding these exclusions ensures a transparent and honest relationship between Valour and every owner.
                                </p>
                                <p className="section-text">
                                   Damage resulting from misuse, unauthorized modification, neglect, or servicing performed outside our authorized network will void coverage. Cosmetic wear from normal use is expected and is not classified as a defect.
                                </p>
                                <ul className="bullet-list">
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                       Physical damage from impact, drops, or mishandling
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Water damage beyond the watch's rated resistance depth
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                       Unauthorized modifications or third-party servicing
                                    </li>
                                    <li className="bullet-item">
                                        <span className="bullet" />
                                        Normal wear to straps, buckles, and case finishing
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
        </div>
    );
};

export default WatchWarranty;