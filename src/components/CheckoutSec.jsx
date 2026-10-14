"use client"
import React, { useState } from 'react';
import { Lock, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import {
  selectCartCount,
  selectCartLines,
  selectHasPricedItems,
  selectHasUnpricedItems,
  selectSubtotal,
} from '@/app/features/cart/cartSlice';
import { formatPrice, getTotalLabels } from '@/app/features/cart/cartFormat';
import { useCartReady } from '@/app/features/cart/useCartActions';
import {
  COUNTRIES,
  UNITED_STATES,
  US_STATES,
  createInitialCheckout,
  updateField,
  validateCheckout,
} from '@/app/features/checkout/checkoutForm';

// Online payment isn't available yet (Phase B): this page shows the real cart and
// collects/validates details for feedback only. Nothing is stored, sent or charged,
// and no card details are collected.

const fieldId = (key) => `checkout-${key.replace('.', '-')}`

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// Keyboard-operable version of the existing custom checkbox (same look).
const Checkbox = ({ id, checked, onToggle, children }) => (
  <div className="checkbox-group">
    <div
      id={id}
      className={`custom-checkbox ${checked ? 'checked' : ''}`}
      role="checkbox"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      {checked && <CheckIcon />}
    </div>
    <label id={`${id}-label`} className="checkbox-label" style={{ color: 'var(--text-secondary)' }} onClick={onToggle}>
      {children}
    </label>
  </div>
)

// Input with a visually hidden label (placeholder look unchanged) and an inline error.
const TextField = ({ fieldKey, label, placeholder, error, required, ...inputProps }) => {
  const id = fieldId(fieldKey)
  return (
    <div className="form-group">
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <input
        id={id}
        className={`form-input${error ? ' has-error' : ''}`}
        placeholder={placeholder ?? label}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  )
}

const SelectField = ({ fieldKey, label, options, emptyOption, error, required, ...selectProps }) => {
  const id = fieldId(fieldKey)
  return (
    <div className="form-group">
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <select
        id={id}
        className={`form-select${error ? ' has-error' : ''}`}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...selectProps}
      >
        {emptyOption && <option value="">{emptyOption}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  )
}

// Delivery and billing share this markup but each writes only its own section.
const AddressFields = ({ section, values, fieldProps }) => {
  const ac = section === 'delivery' ? 'shipping' : 'billing'
  const isUS = values.country === UNITED_STATES
  return (
    <>
      <SelectField {...fieldProps(section, 'country')} label="Country / region" options={COUNTRIES} required autoComplete={`${ac} country-name`} />
      <div className="form-row">
        <TextField {...fieldProps(section, 'firstName')} label="First name" required autoComplete={`${ac} given-name`} />
        <TextField {...fieldProps(section, 'lastName')} label="Last name" required autoComplete={`${ac} family-name`} />
      </div>
      <TextField {...fieldProps(section, 'address')} label="Address" required autoComplete={`${ac} address-line1`} />
      <TextField {...fieldProps(section, 'apartment')} label="Apartment, suite, etc. (optional)" autoComplete={`${ac} address-line2`} />
      <div className="form-row three-col">
        <TextField {...fieldProps(section, 'city')} label="City" required autoComplete={`${ac} address-level2`} />
        <SelectField
          {...fieldProps(section, 'state')}
          label={isUS ? 'State' : 'State (optional)'}
          emptyOption="State"
          options={US_STATES}
          required={isUS}
          autoComplete={`${ac} address-level1`}
        />
        <TextField {...fieldProps(section, 'zip')} label="ZIP code" required autoComplete={`${ac} postal-code`} />
      </div>
      <TextField {...fieldProps(section, 'phone')} type="tel" label="Phone (optional)" placeholder="Phone" autoComplete={`${ac} tel`} />
    </>
  )
}

const CheckoutSec = () => {
  const ready = useCartReady();
  const lines = useSelector(selectCartLines);
  const count = useSelector(selectCartCount);
  const subtotal = useSelector(selectSubtotal);
  const hasPricedItems = useSelector(selectHasPricedItems);
  const hasUnpricedItems = useSelector(selectHasUnpricedItems);
  const totals = getTotalLabels({ subtotal, hasPricedItems, hasUnpricedItems });

  const [form, setForm] = useState(createInitialCheckout);
  // Errors show for fields the customer has left, never on first view.
  const [touched, setTouched] = useState(() => new Set());
  const errors = validateCheckout(form);

  const fieldProps = (section, name) => {
    const key = `${section}.${name}`
    const value = section === 'contact' ? form[name] : form[section][name]
    return {
      fieldKey: key,
      name,
      value,
      error: touched.has(key) ? errors[key] : undefined,
      onChange: (e) => setForm((prev) => updateField(prev, section, name, e.target.value)),
      onBlur: () => setTouched((prev) => new Set(prev).add(key)),
    }
  }

  // Wait for the saved cart, so the first render matches the server and an
  // empty-cart message doesn't flash before the cart loads.
  if (!ready) {
    return <div className="checkout-dark"><div className="container" /></div>
  }

  if (lines.length === 0) {
    return (
      <div className="checkout-dark">
        <div className="container">
          <div className="checkout-empty">
            <h2 className="section-title">Your cart is empty</h2>
            <p>Add a watch to your cart to continue to checkout.</p>
            <Link href="/our-shop/" className="theme-btn">Continue shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="checkout-dark">
        <div className="container">
          <div className="row">
            {/* Main Content */}
            <div className="checkout-main col-md-6 col-lg-4">
              {/* Field feedback only: there's no submit while online payment is unavailable. */}
              <form noValidate onSubmit={(e) => e.preventDefault()}>
                {/* Contact */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Contact</h2>
                  </div>
                  <TextField {...fieldProps('contact', 'email')} type="email" label="Email" required autoComplete="email" />
                  <Checkbox
                    id="checkout-email-offers"
                    checked={form.emailOffers}
                    onToggle={() => setForm((prev) => ({ ...prev, emailOffers: !prev.emailOffers }))}
                  >
                    Email me with news and offers
                  </Checkbox>
                </div>

                {/* Delivery */}
                <div style={{ marginBottom: '2rem' }}>
                  <h2 className="section-title">Delivery</h2>
                  <AddressFields section="delivery" values={form.delivery} fieldProps={fieldProps} />
                </div>

                {/* Shipping Method */}
                <div style={{ marginBottom: '2rem' }}>
                  <h2 className="section-title">Shipping method</h2>
                  <div className="shipping-placeholder">
                    Shipping options will be available when online checkout opens.
                  </div>
                </div>

                {/* Payment */}
                <div style={{ marginBottom: '2rem' }}>
                  <div className="payment-header">
                    <h2 className="section-title" style={{ margin: 0 }}>Payment</h2>
                  </div>

                  <div className="payment-option">
                    <div className="payment-option-body">
                      <div className="payment-notice" id="checkout-payment-notice">
                        <Lock size={16} color="#b0b0b0" aria-hidden="true" />
                        <div>
                          <p className="payment-notice-title">Secure online payment coming soon</p>
                          <p className="payment-notice-text">
                            Online payment isn&apos;t available yet, so no order can be placed here and no card details are collected.
                            {hasUnpricedItems && ' Prices for items in your cart are on request.'}
                          </p>
                        </div>
                      </div>

                      <Checkbox
                        id="checkout-same-billing"
                        checked={form.useShippingAsBilling}
                        onToggle={() => setForm((prev) => ({ ...prev, useShippingAsBilling: !prev.useShippingAsBilling }))}
                      >
                        Use shipping address as billing address
                      </Checkbox>
                      {/* Billing address — its own values; inert while hidden so it can't take focus */}
                      <div className={`billing ${!form.useShippingAsBilling ? "active" : ""}`} inert={form.useShippingAsBilling}>
                        <h2 className="section-title">Billing address</h2>
                        <AddressFields section="billing" values={form.billing} fieldProps={fieldProps} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pay Button — disabled until online payment exists */}
                <button type="submit" className="pay-btn" disabled aria-describedby="checkout-payment-notice">
                  Payment coming soon
                </button>
              </form>
            </div>

            {/* Sidebar - Order Summary */}
            <div className="checkout-sidebar col-md-6 col-lg-4">
              <div className="sticky-sec">
                <div className="sidebar-header">
                  <h3 className="sidebar-title">Order summary</h3>
                  <div className="cart-icon-wrapper">
                    <ShoppingBag size={20} color="#b0b0b0" aria-hidden="true" />
                    <span className="cart-badge" aria-label={`${count} ${count === 1 ? 'item' : 'items'}`}>{count}</span>
                  </div>
                </div>

                {/* Products */}
                <div className="order-lines">
                  {lines.map((line) => (
                    <div className="product-card" key={line.lineId}>
                      <div className="product-image">
                        {line.layers ? (
                          <div className="cart-layers" role="img" aria-label={line.name}>
                            {line.layers.map((src) => <img key={src} src={src} alt="" />)}
                          </div>
                        ) : (
                          <img src={line.image} alt={line.name} />
                        )}
                        <span className="product-image-badge">
                          <span className="visually-hidden">Quantity </span>{line.quantity}
                        </span>
                      </div>
                      <div className="product-info">
                        <div className="product-name">{line.name}</div>
                        {line.optionLabels.length > 0 && (
                          <div className="product-edition">
                            {line.optionLabels.map((o) => `${o.label}: ${o.value}`).join(' · ')}
                          </div>
                        )}
                      </div>
                      <div className="product-price">{formatPrice(line.lineTotal)}</div>
                    </div>
                  ))}
                </div>

                <Link href="/cart/" className="edit-cart-link">Edit cart</Link>

                {/* Totals */}
                <div className="totals-section">
                  <div className="total-row">
                    <span className="total-label">Subtotal</span>
                    <span className="total-value">{totals.subtotal}</span>
                  </div>
                  <div className="total-row shipping">
                    <span className="total-label">
                      <span className="shipping-info">Shipping</span>
                    </span>
                    <span className="total-value" style={{ color: 'var(--text-muted)' }}>
                      Not yet available
                    </span>
                  </div>
                  <div className="total-row grand-total">
                    <span className="total-label">Total</span>
                    <span>
                      <span className="total-value">{totals.total}</span>
                    </span>
                  </div>
                  {totals.excludesUnpriced && (
                    <p className="edit-cart-note">Subtotal excludes items priced on request</p>
                  )}
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
