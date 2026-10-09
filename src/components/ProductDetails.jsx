"use client"
import React, { useEffect, useState, useRef } from 'react';
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { Fancybox } from '@fancyapps/ui';
import SplitType from 'split-type';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import "../app/our-shop/shop.css"

const ProductDetails = () => {
    const [activeImage, setActiveImage] = useState(1);
    const [selectedImage, setSelectedImage] = useState();
    const [selectedEdition, setSelectedEdition] = useState('17/100');
    const allProducts = useSelector((state) => state.product.value)

    const sectionRef = useRef(null);
    const titleRef = useRef(null);
    const taglineRef = useRef(null);
    const descriptionRef = useRef(null);
    const mainImageRef = useRef(null);
    const editionSectionRef = useRef(null);
    const buttonRef = useRef(null);
    const descriptionSectionRef = useRef(null);
    const specsTableRef = useRef(null);
    const sliderRef = useRef(null);

    const product = {
        name: 'Sunseeker Yellow',
        subtitle: 'P-01 • Automatic Collection',
        tagline: 'Engineered for Everyday Adventure',
        price: 3200,
        description: [
            {
                text: 'The ',
                bold: 'Sunseeker Yellow',
                suffix: ' embodies the spirit of exploration and optimism, combining contemporary design with dependable Swiss-inspired craftsmanship.'
            },
            {
                text: 'Built with a lightweight ',
                bold: 'titanium case',
                suffix: ' and powered by a precision ',
                bold2: 'automatic movement',
                suffix2: ', it delivers exceptional reliability and smooth performance for every occasion.',
                bold3: 'Designed for modern lifestyles',
                suffix3: ', Sunseeker Yellow balances bold aesthetics with everyday practicality.'
            },
            {
                text: 'Distinctive, versatile, and unmistakably Valour—',
                bold: 'Sunseeker Yellow is made for those who move forward with confidence.'
            }
        ],

        thumbnails: [
            { id: 1, img: '/images/watch-1.png' },
            { id: 2, img: '/images/watch-2.png' },
            { id: 3, img: '/images/watch-3.png' },
            { id: 4, img: '/images/watch-4.png' },
            { id: 5, img: '/images/watch-5.png' },
            { id: 6, img: '/images/watch-6.png' }
        ],

        mainImage: '/images/watch-1.png',

        editions: ['P-01', 'P-02', 'P-03', 'P-04', 'P-05'],

        specs: [
            { label: 'Case Material', value: 'Titanium' },
            { label: 'Case Diameter', value: '40mm' },
            { label: 'Case Thickness', value: '11.2mm' },
            { label: 'Movement', value: 'Automatic Mechanical' },
            { label: 'Power Reserve', value: '72 Hours' },
            { label: 'Water Resistance', value: '100m / 10 ATM' },
            { label: 'Strap Material', value: 'Premium Textile Strap' },
            { label: 'Crystal', value: 'Scratch-Resistant Sapphire' },
            { label: 'Dial Finish', value: 'Sunburst Yellow' },
            { label: 'Weight', value: '78g' },
            { label: 'Warranty', value: '5 Years International' }
        ]
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const section = sectionRef.current;
        if (!section) return;

        const productTitle = new SplitType('.product-title', { types: 'words,chars' });

        const titleWords = section.querySelectorAll('.product-title .word');
        titleWords.forEach(word => {
            word.style.overflow = 'hidden';
            word.style.display = 'inline-block';
        });


        productTitle.chars?.forEach((char, i) => {
            char.style.display = 'inline-block';
            char.style.opacity = '0';
            char.style.transform = 'translateY(40px) rotateX(90deg)';
            char.style.transformOrigin = 'center bottom';
        });

        if (taglineRef.current) {
            taglineRef.current.style.opacity = '0';
            taglineRef.current.style.transform = 'translateY(30px)';
            taglineRef.current.style.filter = 'blur(8px)';
        }

        if (descriptionRef.current) {
            descriptionRef.current.style.opacity = '0';
            descriptionRef.current.style.transform = 'translateY(30px)';
            descriptionRef.current.style.filter = 'blur(8px)';
        }

        if (mainImageRef.current) {
            mainImageRef.current.style.opacity = '0';
            mainImageRef.current.style.transform = 'scale(0.7) rotateY(-15deg) rotateX(10deg) translateZ(0)';
            mainImageRef.current.style.filter = 'blur(12px) brightness(0.8)';
        }

        if (editionSectionRef.current) {
            editionSectionRef.current.style.opacity = '0';
            editionSectionRef.current.style.transform = 'translateY(20px)';
            editionSectionRef.current.style.filter = 'blur(6px)';
        }

        if (buttonRef.current) {
            buttonRef.current.style.opacity = '0';
            buttonRef.current.style.transform = 'scale(0.95) translateY(20px)';
        }

        if (descriptionSectionRef.current) {
            descriptionSectionRef.current.style.opacity = '0';
            descriptionSectionRef.current.style.transform = 'translateY(40px)';
        }

        if (specsTableRef.current) {
            specsTableRef.current.style.opacity = '0';
            specsTableRef.current.style.transform = 'scale(0.95) translateY(30px)';
        }

        if (sliderRef.current) {
            sliderRef.current.style.opacity = '0';
            sliderRef.current.style.transform = 'translateY(40px)';
        }

        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px',
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    productTitle.chars?.forEach((char, i) => {
                        setTimeout(() => {
                            char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
                            char.style.opacity = '1';
                            char.style.transform = 'translateY(0) rotateX(0deg)';
                        }, i * 35);
                    });

                    if (taglineRef.current) {
                        setTimeout(() => {
                            taglineRef.current.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                            taglineRef.current.style.opacity = '1';
                            taglineRef.current.style.transform = 'translateY(0)';
                            taglineRef.current.style.filter = 'blur(0px)';
                        }, 150);
                    }

                    if (descriptionRef.current) {
                        setTimeout(() => {
                            descriptionRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                            descriptionRef.current.style.opacity = '1';
                            descriptionRef.current.style.transform = 'translateY(0)';
                            descriptionRef.current.style.filter = 'blur(0px)';
                        }, 250);
                    }

                    if (editionSectionRef.current) {
                        setTimeout(() => {
                            editionSectionRef.current.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                            editionSectionRef.current.style.opacity = '1';
                            editionSectionRef.current.style.transform = 'translateY(0)';
                            editionSectionRef.current.style.filter = 'blur(0px)';
                        }, 350);
                    }

                    if (buttonRef.current) {
                        setTimeout(() => {
                            buttonRef.current.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            buttonRef.current.style.opacity = '1';
                            buttonRef.current.style.transform = 'scale(1) translateY(0)';
                        }, 450);
                    }

                    if (mainImageRef.current) {
                        setTimeout(() => {
                            mainImageRef.current.style.transition = 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            mainImageRef.current.style.opacity = '1';
                            mainImageRef.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg) translateZ(0)';
                            mainImageRef.current.style.filter = 'blur(0px) brightness(1)';
                        }, 100);
                    }

                    observer.unobserve(section);
                }
            });
        }, observerOptions);

        observer.observe(section);

        const descriptionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (descriptionSectionRef.current) {
                        setTimeout(() => {
                            descriptionSectionRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                            descriptionSectionRef.current.style.opacity = '1';
                            descriptionSectionRef.current.style.transform = 'translateY(0)';
                        }, 100);
                    }

                    if (specsTableRef.current) {
                        setTimeout(() => {
                            specsTableRef.current.style.transition = 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            specsTableRef.current.style.opacity = '1';
                            specsTableRef.current.style.transform = 'scale(1) translateY(0)';
                        }, 250);
                    }

                    descriptionObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        if (descriptionSectionRef.current) {
            descriptionObserver.observe(descriptionSectionRef.current);
        }

        const sliderObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (sliderRef.current) {
                        setTimeout(() => {
                            sliderRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                            sliderRef.current.style.opacity = '1';
                            sliderRef.current.style.transform = 'translateY(0)';
                        }, 150);
                    }

                    sliderObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        if (sliderRef.current) {
            sliderObserver.observe(sliderRef.current);
        }

        return () => {
            observer.disconnect();
            descriptionObserver.disconnect();
            sliderObserver.disconnect();
            productTitle.revert?.();
        };
    }, []);

    useEffect(() => {
        const newImg = product.thumbnails.find((item) => item.id == activeImage)
        setSelectedImage(newImg)

    }, [activeImage])



    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(price);
    };


    useEffect(() => {
        Fancybox.bind("[data-fancybox]", {
        });

        return () => {
            Fancybox.destroy();
        };
    }, []);



    return (
        <>
            <section className="product-page" ref={sectionRef}>
                <div className="container">

                    <div className="row">
                        {/* Left Column - Images */}
                        <div className="col-lg-6">
                            <div className="d-flex gap-3">
                                {/* Thumbnails */}
                                <div className="thumbnail-sidebar d-none d-lg-flex" data-aos="fade-right">
                                    {product.thumbnails.map((thumb, index) => (
                                        <div
                                            key={index}
                                            className={`thumbnail-item ${activeImage - 1 == index ? 'active' : ''}`}
                                            onClick={() => setActiveImage(index + 1)}
                                        >
                                            <img src={thumb.img} alt={`View ${index + 1}`} loading="lazy" />
                                        </div>
                                    ))}
                                </div>

                                {/* Main Image */}
                                <div className='w-100'>
                                    <div
                                        className="main-image-container"
                                        ref={mainImageRef}
                                    >

                                        <a
                                            data-fancybox="gallery"
                                            href={selectedImage?.img}
                                        >
                                            <img
                                                src={selectedImage?.img}
                                                alt={product.name}
                                                style={{
                                                    filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))'
                                                }}
                                            />
                                        </a>

                                    </div>

                                    {/* Mobile Thumbnails */}
                                    <div className="thumbnail-sidebar d-flex d-lg-none mt-3">
                                        {product.thumbnails.map((thumb, index) => (
                                            <div
                                                key={index}
                                                className={`thumbnail-item ${selectedImage === index ? 'active' : ''}`}
                                                onClick={() => setSelectedImage(index)}
                                            >
                                                <img src={thumb} alt={`View ${index + 1}`} loading="lazy" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Product Info */}
                        <div className="col-lg-6">
                            <div className="ps-lg-4">
                                <h1 className="product-title" ref={titleRef}>
                                    {product.name}<br />{product.subtitle}
                                </h1>

                                <p className="tagline" ref={taglineRef}>{product.tagline}</p>

                                <div className="product-description" ref={descriptionRef}>
                                    {product.description.map((block, index) => (
                                        <p key={index} className="description-block">
                                            {block.text}
                                            {block.bold && <span className="highlight">{block.bold}</span>}
                                            {block.suffix}
                                            {block.bold2 && <span className="highlight">{block.bold2}</span>}
                                            {block.suffix2}
                                            {block.bold3 && <span className="highlight">{block.bold3}</span>}
                                            {block.suffix3}
                                        </p>
                                    ))}
                                </div>

                                {/* Edition Selector */}
                                <div className="edition-section" ref={editionSectionRef}>
                                    <p className="edition-label">
                                        Watch Number: <span>{selectedEdition}</span>
                                    </p>
                                    <select
                                        className="edition-select"
                                        value={selectedEdition}
                                        onChange={(e) => setSelectedEdition(e.target.value)}
                                    >
                                        {product.editions.map((edition) => (
                                            <option key={edition} value={edition}>
                                                {edition}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Add to Cart Button */}
                                <Link href="/cart" className="add-to-cart-btn" ref={buttonRef}>
                                    <span>Add to cart</span>
                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                        <span className="btn-divider"></span>
                                        <span className="btn-price">{formatPrice(product.price)}</span>
                                    </span>
                                </Link>

                                <div className="mobile-spacer d-block d-md-none"></div>
                            </div>
                        </div>
                    </div>

                    <div className="product-description-section" ref={descriptionSectionRef}>
                        <div className="container">
                            <div className="row justify-content-center">
                                <div className="col-lg-8">
                                    <div className="description-content" style={{ marginBottom: '3rem' }}>
                                        <p className="description-text">
                                            The sun powers our solar system with it's unwavering energy. Wear that vitality on your wrist and proclaim your active lifestyle with wrist.
                                        </p>
                                    </div>

                                    <div className="specs-table-wrapper" ref={specsTableRef}>
                                        <table className="specs-table">
                                            <thead>
                                                <tr>
                                                    <th>Feature</th>
                                                    <th>Specification</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {product.specs.map((row, index) => (
                                                    <tr key={index}>
                                                        <td>{row.label}</td>
                                                        <td>{row.value}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="slider" ref={sliderRef}>
                        <Swiper
                            modules={[Autoplay, Pagination]}
                            spaceBetween={20}
                            slidesPerView={4}
                            loop={true}
                            autoplay={{
                                delay: 2000,
                                disableOnInteraction: true,
                            }}
                            pagination={{ clickable: true }}
                            breakpoints={{
                                640: {
                                    slidesPerView: 1,
                                    spaceBetween: 10,
                                },
                                768: {
                                    slidesPerView: 2,
                                    spaceBetween: 10,
                                },
                                1024: {
                                    slidesPerView: 3,
                                    spaceBetween: 20,  // below 1400 = 20
                                },
                                1400: {
                                    slidesPerView: 4,
                                    spaceBetween: 20,  // above 1400 = 40
                                },
                            }}
                        >
                            {allProducts.map((watch, index) => (
                                <SwiperSlide key={watch.id}>
                                    <div
                                        className="ht-card"
                                        // onClick={() => handleCart(watch)}
                                        onClick={() => router.push("/product-details")}
                                    >
                                        <div className="ht-card-inner">
                                            <div className="ht-card-glow" />

                                            {watch.limited && (
                                                <div className="ht-limited-badge">
                                                    <span>Limited</span>
                                                </div>
                                            )}

                                            <div className="ht-image-wrap">
                                                <div className="ht-shimmer" />
                                                <img
                                                    src={watch.image}
                                                    alt={watch.name}
                                                    className="ht-card-img"
                                                    loading="lazy"
                                                />
                                                <div className="ht-hover-overlay">
                                                    <div className="ht-hover-content">
                                                        <div className="ht-hover-line">
                                                            <div className="line" />
                                                            <span>Explore</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ht-card-info">
                                                <div className="ht-card-header">
                                                    <div>
                                                        <p className="ht-card-ref">{watch.ref}</p>
                                                        <h3 className="ht-card-name">{watch.name}</h3>
                                                    </div>
                                                    <div className="ht-card-arrow">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 5l7 7-7 7"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <p className="ht-card-subtitle">{watch.subtitle}</p>
                                                <div className="ht-card-specs">
                                                    <span>{watch.material}</span>
                                                    <div className="dot" />
                                                    <span>{watch.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </section>
        </>
    );
};

export default ProductDetails;