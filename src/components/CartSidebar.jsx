'use client'

import { clearCartNotice, toggleCartSidebar } from '@/app/features/cart/cSidebarSlice';
import {
    selectCartCount,
    selectCartLines,
    selectHasPricedItems,
    selectHasUnpricedItems,
    selectSubtotal,
} from '@/app/features/cart/cartSlice';
import { formatPrice, getTotalLabels } from '@/app/features/cart/cartFormat';
import { useCartActions, useCartReady } from '@/app/features/cart/useCartActions';
import Link from 'next/link'
import React, { useEffect, useRef } from 'react'
import { FaCartArrowDown, FaLock, FaXmark } from 'react-icons/fa6'
import { useDispatch, useSelector } from 'react-redux';

// How long a cart notice stays visible.
const NOTICE_MS = 4000;

// Enter / Space activation for non-button elements acting as buttons.
const onActivateKey = (handler) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
    }
};

const CartSidebar = () => {
    const ref = useRef();
    const closeBtnRef = useRef();
    const dispatch = useDispatch();
    const isCartSideOpen = useSelector((state) => state.cSidebar.value);
    const notice = useSelector((state) => state.cSidebar.notice);

    const lines = useSelector(selectCartLines);
    const count = useSelector(selectCartCount);
    const hydrated = useCartReady();
    const subtotal = useSelector(selectSubtotal);
    const hasPricedItems = useSelector(selectHasPricedItems);
    const hasUnpricedItems = useSelector(selectHasUnpricedItems);
    const { increase, decrease, remove, clear } = useCartActions();

    const totals = getTotalLabels({ subtotal, hasPricedItems, hasUnpricedItems });
    const closeSidebar = () => dispatch(toggleCartSidebar(false));

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                ref.current &&
                !ref.current.contains(e.target) &&
                // Add to Cart buttons open the sidebar themselves; closing it
                // here first would make it flicker (or stay shut on double-click).
                !e.target.closest?.('[data-opens-cart]')
            ) {
                dispatch(toggleCartSidebar(false));
            }

        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dispatch])

    // Move focus into the sidebar when it opens (it's first in the DOM, so Tab
    // from the header would never reach it), allow Escape to close, and hand
    // focus back to whatever opened it.
    useEffect(() => {
        if (!isCartSideOpen) return;
        const opener = document.activeElement;
        closeBtnRef.current?.focus({ preventScroll: true });

        const onKeyDown = (e) => {
            if (e.key === 'Escape') dispatch(toggleCartSidebar(false));
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            if (opener instanceof HTMLElement && document.contains(opener)) {
                opener.focus({ preventScroll: true });
            }
        };
    }, [isCartSideOpen, dispatch])

    // Each notice clears itself; a newer one (new id) restarts the timer.
    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => dispatch(clearCartNotice(notice.id)), NOTICE_MS);
        return () => clearTimeout(timer);
    }, [notice, dispatch])

    return (
        // inert while closed: the off-screen sidebar can't take focus or be read out.
        <div
            className={`cart-sidebar ${isCartSideOpen ? "active" : ""}`}
            ref={ref}
            inert={!isCartSideOpen}
            role="dialog"
            aria-label="Shopping cart"
        >
            <div className="cart-sidebar-main">
                <div className="head">
                    <h3>Cart {hydrated && <span>{count}</span>}</h3>
                    <div className="close-btn"
                        ref={closeBtnRef}
                        role="button"
                        tabIndex={0}
                        aria-label="Close cart"
                        onClick={closeSidebar}
                        onKeyDown={onActivateKey(closeSidebar)}
                    >
                        <FaXmark />
                    </div>
                </div>

                {/* Always rendered so screen readers announce changes to it. */}
                <p className={`cart-notice ${notice?.type ?? ''}`} role="status">{notice?.text}</p>

                {hydrated && (
                    <div className="items">
                        {lines.length === 0 && (
                            <p className="empty-text">Your cart is currently empty.</p>
                        )}
                        {lines.map((line) => (
                            <div className="item" key={line.lineId}>
                                <div className="img">
                                    {line.layers ? (
                                        <div className="cart-layers" role="img" aria-label={line.name}>
                                            {line.layers.map((src) => (
                                                <img key={src} src={src} className='img-fluid' alt="" />
                                            ))}
                                        </div>
                                    ) : (
                                        <img src={line.image} className='img-fluid' alt={line.name} />
                                    )}
                                </div>
                                <div className="t-box">
                                    <div>
                                        <div style={{ position: "relative", paddingBottom: "1px" }}>
                                            <Link href={line.href} className="item-link" onClick={closeSidebar}>
                                                <h5 className='hover-link'>{line.name}</h5>
                                            </Link>
                                        </div>
                                        <p className="price">{formatPrice(line.unitPrice)}</p>
                                        {line.optionLabels.length > 0 && (
                                            <p className="details">
                                                {line.optionLabels.map((o) => `${o.label}: ${o.value}`).join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className='qty'>
                                        <div className="qty-control">
                                            <button
                                                onClick={() => decrease(line)}
                                                aria-label="Decrease quantity"
                                            >
                                                −
                                            </button>
                                            <span>{line.quantity}</span>
                                            <button
                                                onClick={() => increase(line)}
                                                aria-label="Increase quantity"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button type="button" className="rm hover-link" onClick={() => remove(line.lineId)}>remove</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hydrated && lines.length > 0 && (
                    <button type="button" className="rm hover-link clear-cart" onClick={clear}>Clear cart</button>
                )}
            </div>

            {hydrated && (
                <div className="bottom">
                    {lines.length > 0 ? (
                        <>
                            <div className="total">
                                <h3>Total</h3>
                                <h3>{totals.total}</h3>
                            </div>
                            <p>Taxes and shipping calculated at checkout</p>
                            <div className="btns">
                                <Link href='/cart' className='theme-btn' onClick={closeSidebar}><FaCartArrowDown /> View cart</Link>
                                <Link href='/checkout' className='theme-btn' onClick={closeSidebar}><FaLock /> Checkout</Link>
                            </div>
                        </>
                    ) : (
                        <div className="btns">
                            <Link href='/our-shop' className='theme-btn' onClick={closeSidebar}>Continue shopping</Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default CartSidebar
