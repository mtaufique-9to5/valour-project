"use client"
import React, { useState, useRef, useEffect } from 'react';
import {
    Wrench,
    ShieldCheck,
    Truck,
    RotateCcw,
    Clock,
    ChevronRight,
    ArrowRight,
    Mail,
    Phone,
    MapPin
} from 'lucide-react';
import SplitType from 'split-type';
import AOS from 'aos';
import 'aos/dist/aos.css';
import "./c-services.css"
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import PageTransition from '@/components/PageTransition';
import ScrollProvider from '@/components/ScrollProvider';
import AppointmentModal from '@/components/AppointmentModal';

const ClientServices = () => {
    const [activeService, setActiveService] = useState(0);
    const [openFaq, setOpenFaq] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        const heroTitle = new SplitType('.hero-title', { types: 'words,chars' });

        // Wrap title words for line breaks
        const titleWords = document.querySelectorAll('.hero-title .word');
        titleWords.forEach(word => {
            word.style.overflow = 'hidden';
            word.style.display = 'inline-block';
        });

        // ===========================
        // INITIAL STATES
        // ===========================
        // Hero title chars - staggered from bottom
        heroTitle.chars?.forEach((char) => {
            char.style.display = 'inline-block';
            char.style.opacity = '0';
            char.style.transform = 'translateY(40px) rotateX(90deg)';
            char.style.transformOrigin = 'center bottom';
        });

        // Service tabs - fade in with stagger
        const serviceTabs = document.querySelectorAll('.service-tab');
        serviceTabs.forEach((tab) => {
            tab.style.opacity = '0';
            tab.style.transform = 'translateX(-30px)';
            tab.style.filter = 'blur(8px)';
        });

        // Detail content - fade + translateY
        const detailImage = document.querySelector('.detail-image');
        const detailContent = document.querySelector('.detail-content');
        if (detailImage) {
            detailImage.style.opacity = '0';
            detailImage.style.transform = 'scale(0.9) rotateY(-15deg)';
            detailImage.style.filter = 'blur(12px)';
        }
        if (detailContent) {
            const detailElements = detailContent.querySelectorAll('.detail-icon, .detail-title, .detail-description, .detail-features, .detail-meta, .detail-cta');
            detailElements.forEach((el) => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.filter = 'blur(8px)';
            });
        }

        // Contact and FAQ sections
        const contactHeading = document.querySelector('.contact-info h2');
        const faqHeading = document.querySelector('.faq-section h2');
        if (contactHeading) {
            const contactSplit = new SplitType(contactHeading, { types: 'words,chars' });
            contactSplit.chars?.forEach((char) => {
                char.style.display = 'inline-block';
                char.style.opacity = '0';
                char.style.transform = 'translateY(30px)';
            });
        }
        if (faqHeading) {
            const faqSplit = new SplitType(faqHeading, { types: 'words,chars' });
            faqSplit.chars?.forEach((char) => {
                char.style.display = 'inline-block';
                char.style.opacity = '0';
                char.style.transform = 'translateY(30px)';
            });
        }

        // Contact methods and FAQ items
        const contactMethods = document.querySelectorAll('.contact-method');
        contactMethods.forEach((method) => {
            method.style.opacity = '0';
            method.style.transform = 'translateX(-20px)';
            method.style.filter = 'blur(8px)';
        });

        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach((item) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
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
                    // Title chars reveal
                    heroTitle.chars?.forEach((char, i) => {
                        setTimeout(() => {
                            char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
                            char.style.opacity = '1';
                            char.style.transform = 'translateY(0) rotateX(0deg)';
                        }, i * 35);
                    });

                    // Service tabs reveal
                    const tabs = entry.target.querySelectorAll('.service-tab');
                    tabs.forEach((tab, i) => {
                        setTimeout(() => {
                            tab.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            tab.style.opacity = '1';
                            tab.style.transform = 'translateX(0)';
                            tab.style.filter = 'blur(0px)';
                        }, i * 50 + 400);
                    });

                    heroObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const heroSection = document.querySelector('.services-hero');
        if (heroSection) {
            heroObserver.observe(heroSection);
        }

        // Detail section observer
        const detailObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const image = entry.target.querySelector('.detail-image');
                    const content = entry.target.querySelector('.detail-content');

                    if (image) {
                        setTimeout(() => {
                            image.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                            image.style.opacity = '1';
                            image.style.transform = 'scale(1) rotateY(0deg)';
                            image.style.filter = 'blur(0px)';
                        }, 100);
                    }

                    if (content) {
                        const elements = content.querySelectorAll('.detail-icon, .detail-title, .detail-description, .detail-features, .detail-meta, .detail-cta');
                        elements.forEach((el, index) => {
                            setTimeout(() => {
                                el.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
                                el.style.opacity = '1';
                                el.style.transform = 'translateY(0)';
                                el.style.filter = 'blur(0px)';
                            }, index * 80 + 300);
                        });
                    }

                    detailObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -100px 0px' });

        const detailSection = document.querySelector('.service-detail');
        if (detailSection) {
            detailObserver.observe(detailSection);
        }

        // Contact section observer
        const contactObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Contact heading animation
                    const contactHeading = entry.target.querySelector('.contact-info h2');
                    if (contactHeading) {
                        const chars = contactHeading.querySelectorAll('.char');
                        chars.forEach((char, i) => {
                            setTimeout(() => {
                                char.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                                char.style.opacity = '1';
                                char.style.transform = 'translateY(0)';
                            }, i * 30);
                        });
                    }

                    // Contact methods animation
                    const methods = entry.target.querySelectorAll('.contact-method');
                    methods.forEach((method, i) => {
                        setTimeout(() => {
                            method.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                            method.style.opacity = '1';
                            method.style.transform = 'translateX(0)';
                            method.style.filter = 'blur(0px)';
                        }, i * 100 + 300);
                    });

                    contactObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        // FAQ section observer
        const faqObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // FAQ heading animation
                    const faqHeading = entry.target.querySelector('.faq-section h2');
                    if (faqHeading) {
                        const chars = faqHeading.querySelectorAll('.char');
                        chars.forEach((char, i) => {
                            setTimeout(() => {
                                char.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                                char.style.opacity = '1';
                                char.style.transform = 'translateY(0)';
                            }, i * 30);
                        });
                    }

                    // FAQ items animation
                    const items = entry.target.querySelectorAll('.faq-item');
                    items.forEach((item, i) => {
                        setTimeout(() => {
                            item.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                            item.style.filter = 'blur(0px)';
                        }, i * 80 + 300);
                    });

                    faqObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        const contactSection = document.querySelector('.contact-section');
        if (contactSection) {
            contactObserver.observe(contactSection);
            faqObserver.observe(contactSection);
        }

        return () => {
            heroObserver.disconnect();
            detailObserver.disconnect();
            contactObserver.disconnect();
            faqObserver.disconnect();
        };
    }, []);


    const services = [
        {
            icon: <Wrench size={28} />,
            title: 'Servicing & Repairs',
            description: 'Complete overhaul, regulation, and restoration of your timepiece by certified master watchmakers.',
            features: [
                'Full movement service and calibration',
                'Water resistance testing and gasket replacement',
                'Crystal polishing and case refinishing',
                'Vintage restoration and parts fabrication',
            ],
            turnaround: '4–6 weeks',
            image: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=800&h=1000&fit=crop'
        },
        {
            icon: <ShieldCheck size={28} />,
            title: 'Authentication & Warranty',
            description: 'Verify the authenticity of your timepiece and extend protection with our comprehensive warranty programs.',
            features: [
                'Certificate of authenticity issuance',
                'Extended warranty up to 5 years',
                'Theft and loss protection plans',
                'Digital ownership records',
            ],
            turnaround: '48 hours',
            image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&h=1000&fit=crop'
        },
        {
            icon: <Truck size={28} />,
            title: 'White Glove Delivery',
            description: 'Secure, insured, and discreet shipping worldwide with real-time tracking and white-glove handling.',
            features: [
                'Fully insured global shipping',
                'Climate-controlled packaging',
                'Signature-required delivery',
                'Discreet unmarked packaging',
            ],
            turnaround: '2–10 days',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=1000&fit=crop'
        },
        {
            icon: <RotateCcw size={28} />,
            title: 'Trade & Upgrade',
            description: 'Seamlessly trade your current timepiece toward a new acquisition with fair market valuation.',
            features: [
                'Complimentary valuation service',
                'Competitive trade-in values',
                'Collection consolidation',
                'Pre-owned certification',
            ],
            turnaround: '72 hours',
            image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=1000&fit=crop'
        }
    ];

    const faqs = [
        {
            question: 'How often should my mechanical watch be serviced?',
            answer: 'We recommend a complete service every 4–5 years for optimal performance. However, if you notice significant time deviation, moisture under the crystal, or unusual sounds, contact us immediately for assessment.'
        },
        {
            question: 'What is covered under the Valour warranty?',
            answer: 'Our standard warranty covers manufacturing defects in materials and workmanship for 2 years from purchase. Extended warranties are available at checkout and cover accidental damage, theft, and loss protection.'
        },
        {
            question: 'Can I service a watch not purchased from Valour?',
            answer: 'Yes. Our service centers accept timepieces from all recognized manufacturers. A preliminary inspection and estimate will be provided before any work commences.'
        },
        {
            question: 'How do I arrange an insured shipment for repair?',
            answer: 'Contact our concierge team to arrange a fully insured, prepaid shipping label. We coordinate with specialized logistics partners who handle high-value timepieces exclusively.'
        },
        {
            question: 'How do I arrange an insured shipment for repair?',
            answer: 'Contact our concierge team to arrange a fully insured, prepaid shipping label. We coordinate with specialized logistics partners who handle high-value timepieces exclusively.'
        },
        {
            question: 'How do I arrange an insured shipment for repair?',
            answer: 'Contact our concierge team to arrange a fully insured, prepaid shipping label. We coordinate with specialized logistics partners who handle high-value timepieces exclusively.'
        },
        {
            question: 'How do I arrange an insured shipment for repair?',
            answer: 'Contact our concierge team to arrange a fully insured, prepaid shipping label. We coordinate with specialized logistics partners who handle high-value timepieces exclusively.'
        },
    ];

    return (
        <>
            <Header />
            <PageTransition />
            <ScrollProvider>
                <div className="snap-section">
                    <section className="services-hero">
                        <div className="container">
                            <h1 className="hero-title">Client Services</h1>
                            <div className="service-tabs">
                                {services.map((service, index) => (
                                    <button
                                        key={index}
                                        className={`service-tab ${activeService === index ? 'active' : ''}`}
                                        onClick={() => setActiveService(index)}
                                    >
                                        {service.icon}
                                        {service.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="service-detail">
                        <div className="container">
                            <div className="detail-grid">
                                <div className="detail-image-wrapper">
                                    <img
                                        src={services[activeService].image}
                                        alt={services[activeService].title}
                                        className="detail-image"
                                    />
                                </div>
                                <div className="detail-content">
                                    <div className="detail-icon">
                                        {services[activeService].icon}
                                    </div>
                                    <h2 className="detail-title">{services[activeService].title}</h2>
                                    <p className="detail-description">{services[activeService].description}</p>

                                    <ul className="detail-features">
                                        {services[activeService].features.map((feature, idx) => (
                                            <li key={idx} className="detail-feature">
                                                <span className="feature-check">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </span>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="detail-meta">
                                        <Clock size={16} color="#888888" />
                                        <span className="meta-label">Typical turnaround:</span>
                                        <span className="meta-value">{services[activeService].turnaround}</span>
                                    </div>

                                    <p className="detail-cta" style={{cursor: "pointer"}} onClick={() => setIsModalOpen(!isModalOpen)}>
                                        Book an appointment
                                        <ArrowRight size={16} />
                                    </p>

                                </div>
                            </div>
                             <AppointmentModal isModalOpen={isModalOpen} onClose={() => setIsModalOpen(!isModalOpen)}/>
                        </div>
                    </section>
                </div>
                <div className="snap-section">
                    <section className="contact-section">
                        <div className="container">
                            <div className="row">
                                {/* Contact Info */}
                                <div className="col-md-6 contact-info">
                                    <h2>Direct Concierge Access</h2>
                                    <p>
                                        Our client services team is available around the clock to assist with
                                        inquiries, arrange services, or provide guidance on care and maintenance.
                                    </p>

                                    <div className="contact-methods">
                                        <a href="mailto:info@valourwatches.com" className="contact-method">
                                            <div className="contact-icon">
                                                <Mail size={18} color="white" />
                                            </div>
                                            <div className="contact-method-content">
                                                <div className="contact-method-label">Email</div>
                                                <div className="contact-method-value">info@valourwatches.com</div>
                                            </div>
                                            <ChevronRight size={16} className="contact-method-arrow" />
                                        </a>

                                        <a href="tel:+12365989866" className="contact-method">
                                            <div className="contact-icon">
                                                <Phone size={18} color="white" />
                                            </div>
                                            <div className="contact-method-content">
                                                <div className="contact-method-label">Phone</div>
                                                <div className="contact-method-value">+1 236 598 9866</div>
                                            </div>
                                            <ChevronRight size={16} className="contact-method-arrow" />
                                        </a>

                                        <div className="contact-method" style={{ cursor: 'default' }}>
                                            <div className="contact-icon">
                                                <MapPin size={18} color="white" />
                                            </div>
                                            <div className="contact-method-content">
                                                <div className="contact-method-label">Flagship Atelier</div>
                                                <div className="contact-method-value">USA • Canada</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* FAQ */}
                                <div className="col-md-6 faq-section">
                                    <h2>Frequently Asked</h2>
                                    <div className="faq-list">
                                        {faqs.map((faq, index) => (
                                            <div
                                                key={index}
                                                className={`faq-item ${openFaq === index ? 'open' : ''}`}
                                            >
                                                <div
                                                    className="faq-question"
                                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                                >
                                                    <span className="faq-question-text">{faq.question}</span>
                                                    <ChevronRight
                                                        size={16}
                                                        className="faq-chevron"
                                                    />
                                                </div>
                                                <div className="faq-answer">
                                                    <p className="faq-answer-text">{faq.answer}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="snap-section">
                    <Footer />
                </div>
            </ScrollProvider>
        </>
    );
};

export default ClientServices;