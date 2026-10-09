import { toggleCartSidebar } from '@/app/features/cart/cSidebarSlice';
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { FaCartArrowDown, FaLock, FaXmark } from 'react-icons/fa6'
import { useDispatch, useSelector } from 'react-redux';

const CartSidebar = () => {
    const ref = useRef();
    const dispatch = useDispatch();
    const isCartSideOpen = useSelector((state) => state.cSidebar.value);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                ref.current &&
                !ref.current.contains(e.target)
            ) {
                dispatch(toggleCartSidebar(false));
            }

        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [])
    return (
        <div className={`cart-sidebar ${isCartSideOpen ? "active" : ""}`} ref={ref}>
            <div>
                <div className="head">
                    <h3>Cart <span>1</span></h3>
                    <div className="close-btn" 
                    onClick={() => dispatch(toggleCartSidebar(false))}
                    >
                        <FaXmark />
                    </div>
                </div>
                <div className="items">
                    <div className="item">
                        <div className="img">
                            <img src="/images/watch-1.png" className='img-fluid' alt="cart image" />
                        </div>
                        <div className="t-box">
                            <div>
                                <div style={{ position: "relative", paddingBottom: "1px" }}><h5 className='hover-link'>Nova Red</h5></div>
                                <p className="price">$499</p>
                                <p className="details">Pre-Order</p>
                            </div>
                            <div className='qty'>
                                <div className="qty-control">
                                    <button
                                        onClick={() => updateQty(item.id, item.quantity - 1)}
                                        aria-label="Decrease quantity"
                                    >
                                        −
                                    </button>
                                    <span>1</span>
                                    <button
                                        onClick={() => updateQty(item.id, item.quantity + 1)}
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>
                                </div>
                                <p className="rm hover-link">remove</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <div className="bottom">
                <div className="total">
                    <h3>Total</h3>
                    <h3>$499 USD</h3>
                </div>
                <p>Taxes and shipping calculated at checkout</p>
                <div className="btns">
                    <Link href='/cart' className='theme-btn' onClick={() => dispatch(toggleCartSidebar(false))}><FaCartArrowDown /> View cart</Link>
                    <Link href='/checkout' className='theme-btn' onClick={() => dispatch(toggleCartSidebar(false))}><FaLock /> Checkout</Link>
                </div>
            </div>
        </div>
    )
}

export default CartSidebar
