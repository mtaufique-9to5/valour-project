"use client"
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Clock, Calendar, Share2, Bookmark, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import SplitType from 'split-type';
import AOS from 'aos';
import 'aos/dist/aos.css';
// Import Swiper styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const BlogDetails = () => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const heroImageRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubtitleRef = useRef(null);
  const articleBodyRef = useRef(null);
  const authorRef = useRef(null);
  const latestSectionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return

    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      mirror: false,
    })


    const titleSplit = new SplitType('.blog-hero-title', { types: 'words,chars' })
    const subtitleSplit = new SplitType('.blog-hero-subtitle', { types: 'chars' })

    const titleWords = document.querySelectorAll('.blog-hero-title .word')
    titleWords.forEach(word => {
      word.style.overflow = 'hidden'
      word.style.display = 'inline-block'
    })

    // ===========================
    // INITIAL STATES
    // ===========================
    titleSplit.chars?.forEach((char) => {
      char.style.display = 'inline-block'
      char.style.opacity = '0'
      char.style.transform = 'translateY(40px) rotateX(90deg)'
      char.style.transformOrigin = 'center bottom'
    })

    subtitleSplit.chars?.forEach((char) => {
      char.style.display = 'inline-block'
      char.style.opacity = '0'
      char.style.transform = 'translateX(-20px) rotateY(-90deg)'
      char.style.transformOrigin = 'left center'
    })

    if (heroImageRef.current) {
      heroImageRef.current.style.opacity = '0'
      heroImageRef.current.style.transform = 'scale(0.8) rotateY(-10deg)'
      heroImageRef.current.style.filter = 'blur(12px) brightness(0.8)'
    }

    if (authorRef.current) {
      authorRef.current.style.opacity = '0'
      authorRef.current.style.transform = 'translateY(30px)'
      authorRef.current.style.filter = 'blur(8px)'
    }

    const paragraphs = document.querySelectorAll('.article-paragraph, .article-heading, .article-quote')
    paragraphs.forEach((p) => {
      p.style.opacity = '0'
      p.style.transform = 'translateY(30px)'
      p.style.filter = 'blur(8px)'
    })

    const images = document.querySelectorAll('.article-image')
    images.forEach((img) => {
      img.style.opacity = '0'
      img.style.transform = 'scale(0.85) rotateY(-8deg)'
      img.style.filter = 'blur(12px)'
    })

    const latestTitle = document.querySelector('.latest-title')
    if (latestTitle) {
      const titleSplitLatest = new SplitType(latestTitle, { types: 'words,chars' })
      titleSplitLatest.chars?.forEach((char) => {
        char.style.display = 'inline-block'
        char.style.opacity = '0'
        char.style.transform = 'translateY(30px)'
      })
    }

    // ===========================
    // INTERSECTION OBSERVER
    // ===========================
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          titleSplit.chars?.forEach((char, i) => {
            setTimeout(() => {
              char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
              char.style.opacity = '1'
              char.style.transform = 'translateY(0) rotateX(0deg)'
            }, i * 35)
          })

          subtitleSplit.chars?.forEach((char, i) => {
            setTimeout(() => {
              char.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
              char.style.opacity = '1'
              char.style.transform = 'translateX(0) rotateY(0deg)'
            }, i * 30 + 400)
          })

          if (heroImageRef.current) {
            setTimeout(() => {
              heroImageRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
              heroImageRef.current.style.opacity = '1'
              heroImageRef.current.style.transform = 'scale(1) rotateY(0deg)'
              heroImageRef.current.style.filter = 'blur(0px) brightness(1)'
            }, 600)
          }
        }
      })
    }, observerOptions)

    const heroSection = document.querySelector('.blog-detail-section')
    if (heroSection) {
      observer.observe(heroSection)
    }

    const articleSection = document.querySelector('.article-body')
    if (articleSection) {
      const bodyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const elements = entry.target.querySelectorAll('.article-paragraph, .article-heading, .article-quote, .article-image')
            elements.forEach((el, index) => {
              setTimeout(() => {
                el.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
                el.style.opacity = '1'
                el.style.transform = 'translateY(0)'
                el.style.filter = 'blur(0px)'
              }, index * 50)
            })
            bodyObserver.unobserve(entry.target)
          }
        })
      }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' })

      bodyObserver.observe(articleSection)
    }

    if (authorRef.current) {
      const authorObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            entry.target.style.opacity = '1'
            entry.target.style.transform = 'translateY(0)'
            entry.target.style.filter = 'blur(0px)'
            authorObserver.unobserve(entry.target)
          }
        })
      }, { threshold: 0.5 })

      authorObserver.observe(authorRef.current)
    }

    const latestTitleElement = document.querySelector('.latest-title')
    if (latestTitleElement) {
      const latestObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const chars = entry.target.querySelectorAll('.char')
            chars.forEach((char, i) => {
              setTimeout(() => {
                char.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                char.style.opacity = '1'
                char.style.transform = 'translateY(0)'
              }, i * 30)
            })
            latestObserver.unobserve(entry.target)
          }
        })
      }, { threshold: 0.5 })

      latestObserver.observe(latestTitleElement)
    }

    AOS.refresh()

    return () => {
      observer.disconnect()
    }
  }, [])

  const article = {
    category: 'CRAFTSMANSHIP',
    date: 'June 10, 2026',
    readTime: '4 min read',
    title: 'The Art of Mechanical Movement',
    subtitle: 'Inside the meticulous process of hand-assembling every Valour caliber, from raw components to finished rotor.',
    heroImage: '/images/blog-hero.webp',
    author: {
      name: 'Marcus Chen',
      role: 'Senior Watchmaker',
      avatar: '/images/testi-3.webp'
    },
    content: [
      {
        type: 'paragraph',
        text: 'The heartbeat of every mechanical watch lies in its movement—a symphony of gears, springs, and levers working in perfect harmony. At Valour, we believe that true luxury is born not from automation, but from the human touch that breathes life into each component.'
      },
      {
        type: 'paragraph',
        text: 'Our calibers begin as raw brass plates, each one inspected under magnification for imperfections invisible to the naked eye. The mainplate serves as the foundation, a canvas upon which hundreds of hours of meticulous work will unfold. Every hole is drilled, every thread is tapped, every surface is finished by hands that have spent decades mastering their craft.'
      },
      {
        type: 'heading',
        text: 'The Assembly Process'
      },
      {
        type: 'paragraph',
        text: 'Assembly begins at dawn in our atelier, where natural light floods through floor-to-ceiling windows. Our watchmakers work in silence, each movement requiring between 300 and 500 individual operations. The escapement, often called the soul of the watch, is adjusted to within fractions of a millimeter to ensure optimal energy transfer.'
      },
      {
        type: 'quote',
        text: 'A mechanical watch is not merely a timekeeping instrument—it is a testament to human ingenuity, patience, and the relentless pursuit of perfection.',
        author: 'Marcus Chen'
      },
      {
        type: 'paragraph',
        text: 'The finishing process is where artistry meets engineering. Each bridge is adorned with Côtes de Genève stripes, applied not by machine but by hand using a rose engine. The anglage, or beveling, creates mirror-polished edges that catch light in ways that photographs can never fully capture.'
      },
      {
        type: 'heading',
        text: 'From Raw Components to Finished Rotor'
      },
      {
        type: 'paragraph',
        text: 'The rotor, responsible for winding the mainspring through the motion of the wearer\'s wrist, undergoes its own transformation. What begins as a solid disc of tungsten is skeletonized, engraved, and balanced until it achieves the precise oscillation frequency that defines a Valour timepiece.'
      },
      {
        type: 'image',
        src: '/images/blog-1.webp',
        caption: 'A Valour caliber during final assembly, showing the intricate finishing work on each bridge.'
      },
      {
        type: 'paragraph',
        text: 'Quality control is relentless. Each movement is subjected to six weeks of testing across multiple positions and temperatures. Only when the daily rate variation falls within -2 to +4 seconds does the movement earn the right to bear the Valour name.'
      }
    ]
  };

  const latestArticles = [
    {
      id: 1,
      category: "CRAFTSMANSHIP",
      title: "The Art of Mechanical Movement",
      excerpt:
        "Inside the meticulous process of hand-assembling every Valour caliber, from raw components to finished rotor.",
      date: "JUNE 10, 2026",
      readTime: "4 MIN READ",
      image:
        "/images/blog-1.webp",
    },
    {
      id: 2,
      category: "DESIGN",
      title: "Why Dial Texture Matters",
      excerpt:
        "A look at sunburst finishing, guilloché patterns, and how light interacts with a well-engineered dial.",
      date: "JUNE 2, 2026",
      readTime: "3 MIN READ",
      image:
        "/images/blog-2.webp",
    },
    {
      id: 3,
      category: "BRAND",
      title: "Two Founders, One Vision",
      excerpt:
        "How a physician and a watch reviewer joined forces to challenge what an accessible luxury watch could be.",
      date: "MAY 24, 2026",
      readTime: "6 MIN READ",
      image:
        "/images/blog-3.webp",
    },
    {
      id: 4,
      category: "COLLECTION",
      title: "Introducing Lucent: Red Edition",
      excerpt:
        "A deep dive into the dimensionality and presence behind our most striking release yet.",
      date: "MAY 15, 2026",
      readTime: "5 MIN READ",
      image:
        "/images/blog-4.webp",
    },
    {
      id: 5,
      category: "CARE",
      title: "Servicing Your Mechanical Watch",
      excerpt:
        "What every owner should know about maintenance intervals, water resistance, and long-term care.",
      date: "MAY 4, 2026",
      readTime: "4 MIN READ",
      image:
        "/images/blog-5.webp",
    },
    {
      id: 6,
      category: "HERITAGE",
      title: "Pre-Owned: A Second Life",
      excerpt:
        "Why we believe in giving historical models a renewed presence on the wrist of a new collector.",
      date: "APRIL 28, 2026",
      readTime: "5 MIN READ",
      image:
        "/images/blog-6.webp",
    },
  ];

  return (
    <>
      <div className="blog-page">
        <section className="blog-detail-section">
          <div className="blog-hero">
            <img
              ref={heroImageRef}
              src={article.heroImage}
              alt={article.title}
              className="blog-hero-image"
            />
            <div className="blog-hero-overlay" />
            <div className="blog-hero-content">
              <span className="blog-category">{article.category}</span>
              <div className="blog-meta">
                <span className="blog-meta-item">
                  <Calendar size={14} />
                  {article.date}
                </span>
                <span className="blog-meta-item">
                  <Clock size={14} />
                  {article.readTime}
                </span>
              </div>
              <h1 className="blog-hero-title">{article.title}</h1>
              <p className="blog-hero-subtitle">{article.subtitle}</p>
            </div>
          </div>

          <div className="article-container">
            <Link href="/blog" className="back-link">
              <ArrowLeft size={16} />
              Back to Blogs
            </Link>

            <div className="article-author" ref={authorRef}>
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="author-avatar"
              />
              <div className="author-info">
                <div className="author-name">{article.author.name}</div>
                <div className="author-role">{article.author.role}</div>
              </div>
              <div className="article-actions">
                <button className="action-btn">
                  <Share2 size={18} />
                </button>
                <button
                  className={`action-btn ${isBookmarked ? 'active' : ''}`}
                  onClick={() => setIsBookmarked(!isBookmarked)}
                >
                  <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            <article className="article-body" ref={articleBodyRef}>
              {article.content.map((block, index) => {
                switch (block.type) {
                  case 'paragraph':
                    return (
                      <p key={index} className="article-paragraph">
                        {block.text}
                      </p>
                    );
                  case 'heading':
                    return (
                      <h2 key={index} className="article-heading">
                        {block.text}
                      </h2>
                    );
                  case 'quote':
                    return (
                      <blockquote key={index} className="article-quote">
                        <p className="article-quote-text">"{block.text}"</p>
                        <cite className="article-quote-author">— {block.author}</cite>
                      </blockquote>
                    );
                  case 'image':
                    return (
                      <figure key={index} className="article-image-block">
                        <img
                          src={block.src}
                          alt={block.caption}
                          className="article-image"
                        />
                        <figcaption className="article-image-caption">
                          {block.caption}
                        </figcaption>
                      </figure>
                    );
                  default:
                    return null;
                }
              })}
            </article>
          </div>
        </section>

        <section className="latest-section" ref={latestSectionRef}>
          <div className="latest-header">
            <h2 className="latest-title">Latest Articles</h2>
          </div>

          <div className="swiper-container">
            <Swiper
              modules={[Autoplay, Pagination]}
              spaceBetween={20}
              slidesPerView={1}
              loop={true}
              autoplay={{
                delay: 2000,
                disableOnInteraction: true,
              }}
              pagination={{ clickable: true }}
              breakpoints={{
              575: {
                slidesPerView: 1,
                spaceBetween: 10,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 10,
              },
              991: {
                slidesPerView: 2,
                spaceBetween: 15,  // below 991 = 20
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 15,  // below 1024 = 20
              },
              1200: {
                slidesPerView: 4,
                spaceBetween: 20,  // below 1200 = 20
              },
              1400: {
                slidesPerView: 4,
                spaceBetween: 20,  // above 1400 = 40
              },
            }}
            >
              {latestArticles.map((post, idx) => (
                <SwiperSlide>
                  <article className={`blog-card ${idx === 0 ? "featured" : ""}`}>
                    <div className="card-img-wrap">
                      <img src={post.image} alt={post.title} />
                      <div className="img-overlay" />
                      <span className="category-tag">{post.category}</span>
                      <span className="bottom-rule" />
                    </div>
                    <div className="card-body">
                      <p className="card-meta">
                        {post.date} <span className="meta-dot">—</span>{" "}
                        {post.readTime}
                      </p>
                      <h3 className="card-title">{post.title}</h3>
                      <span className="title-divider" />
                      <p className="card-excerpt">{post.excerpt}</p>
                      <Link href="/blog-details" className="read-more">
                        READ ARTICLE
                      </Link>
                    </div>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>
      </div>
    </>
  );
};

export default BlogDetails;