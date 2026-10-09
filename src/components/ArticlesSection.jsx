"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import SplitType from "split-type";

const blogPosts = [
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

export default function ArticleSection() {
  const sectionRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const section = sectionRef.current
    if (!section) return

    // ===========================
    // SPLIT TEXT SETUP (BANNER)
    // ===========================
    const bannerTitle = new SplitType('.banner-title', { types: 'chars' })

    // ===========================
    // INITIAL STATES
    // ===========================
    bannerTitle.chars?.forEach((char, i) => {
      char.style.display = 'inline-block'
      char.style.opacity = '0'
      char.style.transform = 'translateY(40px) rotateX(90deg)'
      char.style.transformOrigin = 'center bottom'
    })

    const cards = section.querySelectorAll('.blog-card')
    cards.forEach((card) => {
      card.style.opacity = '0'
      card.style.transform = 'translateY(40px)'
      card.style.filter = 'blur(8px)'

      const cardImg = card.querySelector('.card-img-wrap img')
      if (cardImg) {
        cardImg.style.opacity = '0'
        cardImg.style.transform = 'scale(0.8) rotateY(-15deg)'
        cardImg.style.filter = 'blur(12px) brightness(0.7)'
      }

      const categoryTag = card.querySelector('.category-tag')
      if (categoryTag) {
        categoryTag.style.opacity = '0'
        categoryTag.style.transform = 'translateX(-20px) rotateY(-90deg)'
      }

      const cardTitle = card.querySelector('.card-title')
      if (cardTitle) {
        cardTitle.style.opacity = '0'
        cardTitle.style.transform = 'translateY(20px)'
      }

      const cardExcerpt = card.querySelector('.card-excerpt')
      if (cardExcerpt) {
        cardExcerpt.style.opacity = '0'
        cardExcerpt.style.transform = 'translateY(20px)'
        cardExcerpt.style.filter = 'blur(5px)'
      }

      const readMoreLink = card.querySelector('.read-more')
      if (readMoreLink) {
        readMoreLink.style.opacity = '0'
        readMoreLink.style.transform = 'translateY(15px)'
      }
    })

    // ===========================
    // INTERSECTION OBSERVER
    // ===========================
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          bannerTitle.chars?.forEach((char, i) => {
            setTimeout(() => {
              char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
              char.style.opacity = '1'
              char.style.transform = 'translateY(0) rotateX(0deg)'
            }, i * 35)
          })

          cards.forEach((card, cardIdx) => {
            const cardDelay = cardIdx * 100 + 400

            setTimeout(() => {
              card.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
              card.style.opacity = '1'
              card.style.transform = 'translateY(0)'
              card.style.filter = 'blur(0px)'
            }, cardDelay)

            const cardImg = card.querySelector('.card-img-wrap img')
            if (cardImg) {
              setTimeout(() => {
                cardImg.style.transition = 'all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                cardImg.style.opacity = '1'
                cardImg.style.transform = 'scale(1) rotateY(0deg)'
                cardImg.style.filter = 'blur(0px) brightness(1)'
              }, cardDelay + 100)

              cardImg.addEventListener('mouseenter', () => {
                cardImg.style.transition = 'all 0.4s ease-out'
                cardImg.style.transform = 'scale(1.06) rotateY(3deg)'
                cardImg.style.filter = 'blur(0px) brightness(1.15)'
              })

              cardImg.addEventListener('mouseleave', () => {
                cardImg.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                cardImg.style.transform = 'scale(1) rotateY(0deg)'
                cardImg.style.filter = 'blur(0px) brightness(1)'
              })
            }

            const categoryTag = card.querySelector('.category-tag')
            if (categoryTag) {
              setTimeout(() => {
                categoryTag.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                categoryTag.style.opacity = '1'
                categoryTag.style.transform = 'translateX(0) rotateY(0deg)'
              }, cardDelay + 200)
            }

            const cardTitle = card.querySelector('.card-title')
            if (cardTitle) {
              setTimeout(() => {
                cardTitle.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
                cardTitle.style.opacity = '1'
                cardTitle.style.transform = 'translateY(0)'
              }, cardDelay + 300)
            }

            const cardExcerpt = card.querySelector('.card-excerpt')
            if (cardExcerpt) {
              setTimeout(() => {
                cardExcerpt.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                cardExcerpt.style.opacity = '1'
                cardExcerpt.style.transform = 'translateY(0)'
                cardExcerpt.style.filter = 'blur(0px)'
              }, cardDelay + 400)
            }

            const readMoreLink = card.querySelector('.read-more')
            if (readMoreLink) {
              setTimeout(() => {
                readMoreLink.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
                readMoreLink.style.opacity = '1'
                readMoreLink.style.transform = 'translateY(0)'
              }, cardDelay + 500)

              readMoreLink.addEventListener('mouseenter', () => {
                readMoreLink.style.transition = 'all 0.3s ease-out'
                readMoreLink.style.transform = 'translateY(-2px)'
              })

              readMoreLink.addEventListener('mouseleave', () => {
                readMoreLink.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                readMoreLink.style.transform = 'translateY(0)'
              })
            }
          })

          observer.unobserve(section)
        }
      })
    }, observerOptions)

    observer.observe(section)

    // Cleanup
    return () => {
      observer.disconnect()
      bannerTitle.revert?.()
    }
  }, [])

  return (
    <section className="valour-blog" ref={sectionRef}>
      <section className="blog-banner">
        <div className="container text-center">
          <h1 className="banner-title">The Journal</h1>
        </div>
      </section>

      <section className="blog-grid-section">
        <div className="container">
          <div className="row g-4 g-lg-5">
            {blogPosts.map((post, idx) => (
              <div className="col-12 col-md-6 col-lg-4" key={post.id}>
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
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
