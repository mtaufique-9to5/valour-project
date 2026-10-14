"use client"
import {
  selectCartLines,
  selectHasPricedItems,
  selectHasUnpricedItems,
  selectSubtotal,
} from '@/app/features/cart/cartSlice';
import { formatPrice, getTotalLabels } from '@/app/features/cart/cartFormat';
import { useCartActions, useCartReady } from '@/app/features/cart/useCartActions';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import SplitType from 'split-type';
import AOS from 'aos';
import 'aos/dist/aos.css';



export default function Cart() {
  const { increase, decrease, remove, clear } = useCartActions()

  const cart = useSelector(selectCartLines)
  const hydrated = useCartReady()
  const subtotal = useSelector(selectSubtotal)
  const hasUnpricedItems = useSelector(selectHasUnpricedItems)
  const hasPricedItems = useSelector(selectHasPricedItems)
  const [note, setNote] = useState('');

  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      mirror: false,
    });

    const section = sectionRef.current;
    if (!section) return;

    // ===========================
    // SPLIT TEXT SETUP
    // ===========================
    const cartTitle = new SplitType('.cart-title', { types: 'words,chars' });

    const titleWords = section.querySelectorAll('.cart-title .word');
    titleWords.forEach(word => {
      word.style.overflow = 'hidden';
      word.style.display = 'inline-block';
    });

    // ===========================
    // INITIAL STATES
    // ===========================
    cartTitle.chars?.forEach((char, i) => {
      char.style.display = 'inline-block';
      char.style.opacity = '0';
      char.style.transform = 'translateY(40px) rotateX(90deg)';
      char.style.transformOrigin = 'center bottom';
    });

    if (contentRef.current) {
      contentRef.current.style.opacity = '0';
      contentRef.current.style.transform = 'translateY(30px)';
      contentRef.current.style.filter = 'blur(8px)';
    }

    // ===========================
    // INTERSECTION OBSERVER
    // ===========================
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          cartTitle.chars?.forEach((char, i) => {
            setTimeout(() => {
              char.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
              char.style.opacity = '1';
              char.style.transform = 'translateY(0) rotateX(0deg)';
            }, i * 35);
          });

          if (contentRef.current) {
            setTimeout(() => {
              contentRef.current.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
              contentRef.current.style.opacity = '1';
              contentRef.current.style.transform = 'translateY(0)';
              contentRef.current.style.filter = 'blur(0px)';
            }, 200);
          }

          observer.unobserve(section);
        }
      });
    }, observerOptions);

    observer.observe(section);

    // Cleanup
    return () => {
      observer.disconnect();
      cartTitle.revert?.();
    };
  }, []);

  const totals = getTotalLabels({ subtotal, hasPricedItems, hasUnpricedItems });

  return (
    <>
      <section className="valour-cart" ref={sectionRef}>
        <div className="container">
          <h1 className="cart-title text-center">Cart</h1>

          {/* Render nothing until the saved cart is loaded, to avoid flashing "empty". */}
          {!hydrated ? null : cart.length === 0 ? (
            <div className="empty-cart text-center">
              <p>Your cart is currently empty.</p>
              <Link href="/our-shop"><p className="continue-link">CONTINUE SHOPPING</p></Link>
            </div>
          ) : (
            <div className="row g-5" ref={contentRef}>
              {/* ===== CART ITEMS ===== */}
              <div className="col-12 col-lg-8">
                <div className="cart-table">
                  <div className="cart-header row">
                    <div className="col-6 col-md-7">PRODUCT</div>
                    <div className="col-3 col-md-3 text-center">QUANTITY</div>
                    <div className="col-3 col-md-2 text-end">TOTAL</div>
                  </div>

                  {cart.map((item) => (
                    <div className="cart-row row align-items-center" key={item.lineId}>
                      <div className="col-6 col-md-7">
                        <div className="product-cell">
                          <div className="product-img-wrap">
                            {item.layers ? (
                              <div className="cart-layers" role="img" aria-label={item.name}>
                                {item.layers.map((src) => (
                                  <img key={src} src={src} alt="" />
                                ))}
                              </div>
                            ) : (
                              <img src={item.image} alt={item.name} />
                            )}
                          </div>
                          <div className="product-info">
                            <p className="product-name">{item.name}</p>
                            <p className="product-price">{formatPrice(item.unitPrice)}</p>
                            {/* Kept even when empty: its margin spaces the REMOVE button. */}
                            <p className="product-edition">
                              {item.optionLabels.map((o) => `${o.label}: ${o.value}`).join(' · ')}
                            </p>
                            <button
                              className="remove-btn"
                              onClick={() => remove(item.lineId)}
                            >
                              REMOVE
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="col-3 col-md-3 text-center">
                        <div className="qty-control">
                          <button
                            onClick={() => decrease(item)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => increase(item)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="col-3 col-md-2 text-end">
                        <p className="row-total">
                          {formatPrice(item.lineTotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="remove-btn" onClick={clear}>
                  CLEAR CART
                </button>
              </div>

              {/* ===== ORDER SUMMARY ===== */}
              <div className="col-12 col-lg-4">
                <div className="summary-card">
                  <div className="summary-line">
                    <span>Subtotal</span>
                    <span>{totals.subtotal}</span>
                  </div>
                  <div className="summary-line total-line">
                    <span>Total</span>
                    <span>{totals.total}</span>
                  </div>
                  {totals.excludesUnpriced && (
                    <p className="summary-note">
                      Subtotal excludes items priced on request
                    </p>
                  )}
                  <p className="summary-note">
                    Taxes and shipping calculated at checkout
                  </p>

                  <textarea
                    className="order-note"
                    placeholder="Order note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />

                  <Link href='/checkout' className='theme-btn know-btn'>Checkout</Link>
                </div>

                <div className="payment-section text-center">
                  <p className="we-accept">We accept</p>
                  <div className="payment-icons">
                    <span>AMEX</span>
                    <span>APPLE PAY</span>
                    <span>DINERS</span>
                    <span>DISCOVER</span>
                    <span>G PAY</span>
                    <span>MASTERCARD</span>
                    <span>VISA</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}