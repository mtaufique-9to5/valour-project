"use client";


import { useState, useEffect, useRef, useCallback } from "react";
import AOS from 'aos';
import 'aos/dist/aos.css';
import SplitType from "split-type";
import { useRouter } from "next/navigation";
import { getProductHref } from "@/app/features/product/productUrl";
import { PriceLabel } from "@/components/product/ProductPrice";

// Watches and straps come from the page (published database products). Strap
// cards show the short colour name ("Black Strap" -> "Black").
const strapCardName = (product) => product.name.replace(/\s+Strap$/, "");



// ─── Filter Options ─────────────────────────────────────────────────────────
// Only the "All" entries are fixed; the other options come from the products on
// the page (see withProductValues), so every filter value matches a real product.
const filterOptions = {
  collection: [{ value: "all", label: "All Collections" }],
  type: [{ value: "all", label: "All Types" }],
  material: [{ value: "all", label: "All Materials" }],
  color: [{ value: "all", label: "All Colors" }],
};

// Filter field per dropdown; each distinct value found on the products becomes an option.
const FILTER_FIELDS = { collection: "collection", type: "movement", material: "material", color: "color" };
const titleCase = (v) => String(v).replace(/[-_]+/g, " ").replace(/w/g, (c) => c.toUpperCase());
function withProductValues(products) {
  const out = {};
  for (const [key, opts] of Object.entries(filterOptions)) {
    const known = new Set(opts.map((o) => o.value));
    const extra = [...new Set(products.map((p) => p[FILTER_FIELDS[key]]).filter((v) => typeof v === "string" && v && !known.has(v)))];
    out[key] = [...opts, ...extra.map((value) => ({ value, label: titleCase(value) }))];
  }
  return out;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function HorizonTimepieces({ watches = [], straps = [] }) {
  const router = useRouter();
  const sectionRef = useRef(null)
  const products = watches
  const options = withProductValues(watches)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const section = sectionRef.current
    if (!section) return

    const bannerTitle = new SplitType('.ht-header h1', { types: 'chars' })

    // ===========================
    // INITIAL STATES
    // ===========================
    bannerTitle.chars?.forEach((char, i) => {
      char.style.display = 'inline-block'
      char.style.opacity = '0'
      char.style.transform = 'translateY(40px) rotateX(90deg)'
      char.style.transformOrigin = 'center bottom'
    })


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
  const [activeFilters, setActiveFilters] = useState({
    collection: "all",
    type: "all",
    material: "all",
    color: "all",
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isListView, setIsListView] = useState(false);
  const [animatedCards, setAnimatedCards] = useState(new Set());
  const cardRefs = useRef([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleFilters = () => {
    setIsFilterOpen(!isFilterOpen);
  }
  const filteredWatches = products.filter((watch) => {
    return (
      (activeFilters.collection === "all" || watch.collection === activeFilters.collection) &&
      (activeFilters.type === "all" || watch.movement === activeFilters.type) &&
      (activeFilters.material === "all" || watch.material === activeFilters.material) &&
      (activeFilters.color === "all" || watch.color === activeFilters.color)
    );
  });

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out',
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = parseInt(entry.target.dataset.id);
            setAnimatedCards((prev) => new Set([...prev, id]));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [filteredWatches.length, isListView]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.ht-filters-left')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleFilterChange = useCallback((filterType, value, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveFilters((prev) => ({ ...prev, [filterType]: value }));
    setOpenDropdown(null);
  }, []);

  const handleReset = useCallback(() => {
    setActiveFilters({
      collection: "all",
      type: "all",
      material: "all",
      color: "all",
    });
  }, []);

  const clearFilter = useCallback((key) => {
    setActiveFilters((prev) => ({ ...prev, [key]: "all" }));
  }, []);

  const activeFilterEntries = Object.entries(activeFilters).filter(
    ([_, val]) => val !== "all"
  );

  const getFilterLabel = (type, value) => {
    const option = options[type]?.find((o) => o.value === value);
    return option ? option.label : value;
  };

  const toggleDropdown = (e, filterType) => {
    e.stopPropagation();
    setOpenDropdown((prev) => (prev === filterType ? null : filterType));
  };



  return (
    <section className="ht-section" ref={sectionRef}>
      <div className="ht-glow-1" />
      <div className="ht-glow-2" />
      <div className="ht-noise" />

      <div
        className="container"
      >
        <div className="ht-header" data-aos="fade-up">
          <h1>
            <span>Valour</span> Watches
          </h1>
        </div>

        <div className="ht-filters-bar" data-aos="fade-down">
          <div className="ht-filters-inner">
            <div className="ht-filters-row">
              <div className="ht-filters-left">
                {isFilterOpen == false ? (
                  <div className="filter-toggle" onClick={() => toggleFilters()}>
                    <p>FILTERS</p>
                    <div className="icon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="icon-other" onClick={() => toggleFilters()}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </div>
                    {

                      Object.entries(options).map(([filterType, options]) => (
                        <div key={filterType} style={{ position: "relative" }}>
                          <button
                            className={`ht-filter-btn ${activeFilters[filterType] !== "all" ? "active" : ""} ${openDropdown === filterType ? "open" : ""
                              }`}
                            onClick={(e) => toggleDropdown(e, filterType)}
                          >
                            <span>
                              {activeFilters[filterType] === "all"
                                ? filterType
                                : getFilterLabel(filterType, activeFilters[filterType])}
                            </span>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {openDropdown === filterType && (
                            <div className="ht-dropdown" onClick={(e) => e.stopPropagation()}>
                              <div className="ht-dropdown-inner">
                                {options.map((opt) => (
                                  <button
                                    key={opt.value}
                                    className="ht-dropdown-item"
                                    onClick={(e) => handleFilterChange(filterType, opt.value, e)}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      ))

                    }
                    <button className="ht-reset-btn" onClick={handleReset}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Reset</span>
                    </button>
                  </>
                )}

              </div>


            </div>

            {activeFilterEntries.length > 0 && (
              <div className="ht-active-filters">
                {activeFilterEntries.map(([key, val]) => (
                  <span key={key} className="ht-active-filter-pill">
                    <span className="pill-label">{key}</span>
                    <span className="pill-value">{val}</span>
                    <button onClick={() => clearFilter(key)} aria-label={`Clear ${key} filter`}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {filteredWatches.length === 0 ? (
          <div className="ht-empty">
            <div className="ht-empty-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3>No watches found</h3>
            <p>Adjust your filters to explore our collection</p>
          </div>
        ) : (
          <div className={`ht-grid ${isListView ? "ht-list-view" : ""}`}>
            {filteredWatches.map((watch, index) => (
              <div
                key={watch.id}
                ref={(el) => (cardRefs.current[index] = el)}
                data-id={watch.id}
                className={`ht-card ${watch.color} ${animatedCards.has(watch.id) ? "animated" : ""}`}
                style={{ animationDelay: `${index * 80}ms` }}
                onClick={() => router.push(getProductHref(watch))}
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
                      <span>{watch.movement}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="strap-sec">
          <h4>Straps</h4>
          <div className={`ht-grid`}>
            {straps.map((product) => (
              <div
                key={product.key}
                className={`ht-card ${product.color}`}
                onClick={() => router.push(getProductHref(product))}
              >
                <div className="ht-card-inner">
                  <div className="ht-card-glow" />

                  <div className="ht-image-wrap">
                    <div className="ht-shimmer" />
                    <img
                      src={product.image}
                      alt="strap"
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
                        <p className="ht-card-ref">{product.ref}</p>
                        <h3 className="ht-card-name">{strapCardName(product)}</h3>
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
                    <div className="ht-card-specs">
                      {/* The strap's own material or subtitle, when set in the admin. */}
                      {(product.material || product.subtitle) && <><span>{product.material || product.subtitle}</span><div className="dot" /></>}
                      <PriceLabel product={product} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </section>

      </div>
    </section>
  );
}
