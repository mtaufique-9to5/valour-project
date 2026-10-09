"use client"
import React, { useEffect, useState } from 'react';
import {
  Lock,
  CreditCard,
  HelpCircle,
  Search,
  ShoppingBag,
  Minus,
  Plus
} from 'lucide-react';
import Link from 'next/link';

const CheckoutSec = () => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    country: 'United States',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    nameOnCard: '',
    useShippingAsBilling: true,
    paymentMethod: 'credit-card',
    saveInfo: false,
    emailOffers: true
  });


  const [quantity, setQuantity] = useState(1);
  const [discountCode, setDiscountCode] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const countries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'UAE', 'Switzerland'];
  const states = ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Nevada'];

  const product = {
    name: 'Sunseeker Yellow - Limited 100',
    edition: '17/100',
    price: 499.00,
    image: '/images/watch-1.png'
  };

  const subtotal = product.price * quantity;
  const total = subtotal;

  return (
    <>
      <div className="checkout-dark">
        <div className="container">
          <div className="row">
            {/* Main Content */}
            <div className="checkout-main col-md-6 col-lg-4">
              {/* Express Checkout */}
              <div className="express-checkout">
                <div className="express-label">Express checkout</div>
                <div className="express-buttons">
                  <button className="express-btn shop-pay">
                    <ShoppingBag size={18} color="white" />
                    <span style={{ color: 'white' }}>shop</span>
                  </button>
                  <button className="express-btn gpay">
                    <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                      <path d="M19.6 8.2c0-.6-.1-1.1-.2-1.6h-6.2v3h3.6c-.1.7-.5 1.3-1.1 1.7v1.4h1.8c1.1-1 1.7-2.5 1.7-4.1z" fill="#ffffff" />
                      <path d="M13.2 16c1.6 0 2.9-.5 3.9-1.4l-1.8-1.4c-.5.4-1.2.6-2.1.6-1.6 0-3-1.1-3.5-2.5H6.9v1.5C7.9 14.6 10.3 16 13.2 16z" fill="#ffffff" />
                      <path d="M9.7 9.7c-.1-.4-.2-.9-.2-1.4 0-.5.1-1 .2-1.4V5.4H6.9C6.3 6.5 6 7.7 6 8.9s.3 2.4.9 3.5l2.8-2.2v-.5z" fill="#ffffff" />
                      <path d="M13.2 3.5c.9 0 1.7.3 2.3.9l1.7-1.7C16.1 1.6 14.8 1 13.2 1c-2.9 0-5.3 1.4-6.3 3.5l2.8 2.2c.5-1.4 1.9-2.5 3.5-2.5z" fill="#ffffff" />
                    </svg>
                    <span style={{ color: 'white' }}>Pay</span>
                  </button>
                </div>
              </div>

              <div className="divider">OR</div>

              {/* Contact */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="section-title" style={{ margin: 0 }}>Contact</h2>
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="checkbox-group">
                  <div
                    className={`custom-checkbox ${formData.emailOffers ? 'checked' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, emailOffers: !prev.emailOffers }))}
                  >
                    {formData.emailOffers && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <label className="checkbox-label" style={{ color: 'var(--text-secondary)' }}>Email me with news and offers</label>
                </div>
              </div>

              {/* Delivery */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 className="section-title">Delivery</h2>
                <div className="form-group">
                  <select
                    name="country"
                    className="form-select"
                    value={formData.country}
                    onChange={handleInputChange}
                  >
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      name="firstName"
                      className="form-input"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="lastName"
                      className="form-input"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="address"
                      className="form-input"
                      placeholder="Address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    name="apartment"
                    className="form-input"
                    placeholder="Apartment, suite, etc. (optional)"
                    value={formData.apartment}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-row three-col">
                  <div className="form-group">
                    <input
                      type="text"
                      name="city"
                      className="form-input"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <select
                      name="state"
                      className="form-select"
                      value={formData.state}
                      onChange={handleInputChange}
                    >
                      <option value="">State</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="zip"
                      className="form-input"
                      placeholder="ZIP code"
                      value={formData.zip}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      placeholder="Phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 className="section-title">Shipping method</h2>
                <div className="shipping-placeholder">
                  Enter your shipping address to view available shipping methods.
                </div>
              </div>

              {/* Payment */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="payment-header">
                  <h2 className="section-title" style={{ margin: 0 }}>Payment</h2>
                  <div className="secure-text">
                    <Lock size={12} color="#888888" />
                    <span>All transactions are secure and encrypted.</span>
                  </div>
                </div>

                <div className="payment-option">
                  <div
                    className="payment-option-header"
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'credit-card' }))}
                  >
                    <div className="payment-option-left">
                      <div className={`radio-circle ${formData.paymentMethod === 'credit-card' ? 'active' : ''}`} />
                      <span className="payment-label">Credit card</span>
                    </div>
                    <div className="payment-icons">
                      <span className="card-badge">VISA</span>
                      <span className="card-badge">MC</span>
                      <span className="card-badge">AMEX</span>
                      <span className="card-badge">+5</span>
                    </div>
                  </div>

                  {formData.paymentMethod === 'credit-card' && (
                    <div className="payment-option-body">
                      <div className="form-group">
                        <div className="input-wrapper">
                          <input
                            type="text"
                            name="cardNumber"
                            className="form-input"
                            placeholder="Card number"
                            value={formData.cardNumber}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div className="card-inputs">
                        <div className="form-group">
                          <input
                            type="text"
                            name="expiry"
                            className="form-input"
                            placeholder="Expiration date (MM / YY)"
                            value={formData.expiry}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <div className="input-wrapper">
                            <input
                              type="text"
                              name="cvc"
                              className="form-input"
                              placeholder="Security code"
                              value={formData.cvc}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="form-group">
                        <input
                          type="text"
                          name="nameOnCard"
                          className="form-input"
                          placeholder="Name on card"
                          value={formData.nameOnCard}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="checkbox-group">
                        <div
                          className={`custom-checkbox ${formData.useShippingAsBilling ? 'checked' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, useShippingAsBilling: !prev.useShippingAsBilling }))}
                        >
                          {formData.useShippingAsBilling && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <label className="checkbox-label" style={{ color: 'var(--text-secondary)' }}>Use shipping address as billing address</label>
                      </div>
                      {/* Billing address */}
                      <div className={`billing ${!formData.useShippingAsBilling ? "active" : ""}`} >
                        <h2 className="section-title">Billing address</h2>
                        <div className="form-group">
                          <select
                            name="country"
                            className="form-select"
                            value={formData.country}
                            onChange={handleInputChange}
                          >
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <input
                              type="text"
                              name="firstName"
                              className="form-input"
                              placeholder="First name"
                              value={formData.firstName}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className="form-group">
                            <input
                              type="text"
                              name="lastName"
                              className="form-input"
                              placeholder="Last name"
                              value={formData.lastName}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <div className="input-wrapper">
                            <input
                              type="text"
                              name="address"
                              className="form-input"
                              placeholder="Address"
                              value={formData.address}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            name="apartment"
                            className="form-input"
                            placeholder="Apartment, suite, etc. (optional)"
                            value={formData.apartment}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-row three-col">
                          <div className="form-group">
                            <input
                              type="text"
                              name="city"
                              className="form-input"
                              placeholder="City"
                              value={formData.city}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className="form-group">
                            <select
                              name="state"
                              className="form-select"
                              value={formData.state}
                              onChange={handleInputChange}
                            >
                              <option value="">State</option>
                              {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <input
                              type="text"
                              name="zip"
                              className="form-input"
                              placeholder="ZIP code"
                              value={formData.zip}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <div className="input-wrapper">
                            <input
                              type="tel"
                              name="phone"
                              className="form-input"
                              placeholder="Phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="alt-payment"
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'shop-pay' }))}
                >
                  <div className="alt-payment-left">
                    <div className={`radio-circle ${formData.paymentMethod === 'shop-pay' ? 'active' : ''}`} />
                    <span className="alt-payment-info">
                      <strong>Shop Pay</strong> <span style={{ color: 'var(--text-muted)' }}>• Pay in full or in installments</span>
                    </span>
                  </div>
                  <span className="alt-logo" style={{ color: 'white' }}>shop</span>
                </div>

                <div
                  className="alt-payment"
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'affirm' }))}
                >
                  <div className="alt-payment-left">
                    <div className={`radio-circle ${formData.paymentMethod === 'affirm' ? 'active' : ''}`} />
                    <span className="alt-payment-info">
                      <strong>Affirm</strong> <span style={{ color: 'var(--text-muted)' }}>- Pay Over Time</span>
                    </span>
                  </div>
                  <span className="alt-logo" style={{ color: 'white' }}>affirm</span>
                </div>
              </div>

              {/* Save Info */}
              <div className="save-info-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="save-info-title">Save my information for a faster checkout</div>
                    <div className="save-info-text">
                      By paying, you agree to create a Shop account subject to Shop's <Link href="/terms-and-conditions">Terms</Link> and <Link href="/privacy-policy">Privacy Policy</Link>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button className="pay-btn">Pay now</button>
            </div>

            {/* Sidebar - Order Summary */}
            <div className="checkout-sidebar col-md-6 col-lg-4">
              <div className="sticky-sec">
                <div className="sidebar-header">
                  <h3 className="sidebar-title">Order summary</h3>
                  <div className="cart-icon-wrapper">
                    <ShoppingBag size={20} color="#b0b0b0" />
                    <span className="cart-badge">{quantity}</span>
                  </div>
                </div>

                {/* Product */}
                <div className="product-card">
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                    <span className="product-image-badge">{quantity}</span>
                  </div>
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-edition">{product.edition}</div>
                  </div>
                  <div className="product-price">${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>

                {/* Quantity Control */}
                <div className="quantity-control">
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus size={14} color="white" />
                  </button>
                  <span className="qty-value">{quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus size={14} color="white" />
                  </button>
                </div>

                {/* Discount Code */}
                <div className="discount-section">
                  <input
                    type="text"
                    className="discount-input"
                    placeholder="Discount code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                  <button className="discount-btn">Apply</button>
                </div>

                {/* Totals */}
                <div className="totals-section">
                  <div className="total-row">
                    <span className="total-label">Subtotal</span>
                    <span className="total-value">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="total-row shipping">
                    <span className="total-label">
                      <span className="shipping-info">
                        Shipping
                        <HelpCircle size={14} color="#888888" />
                      </span>
                    </span>
                    <span className="total-value" style={{ color: 'var(--text-muted)' }}>
                      Enter shipping address
                    </span>
                  </div>
                  <div className="total-row grand-total">
                    <span className="total-label">Total</span>
                    <span>
                      <span className="currency-label">USD</span>
                      <span className="total-value">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default CheckoutSec;