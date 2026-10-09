"use client"
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import React from 'react';
import "../privacy-policy/privacy.css"

const WarrantyPolicy = () => {
  return (
    <>
    <Header />


        {/* Hero */}
        <div className="privacy-hero">
            <div className="container">
          <span className="privacy-label">Legal</span>
          <h1 className="privacy-title">Warranty Policy</h1>
          </div>
        </div>

        {/* Body */}
        <div className="privacy-body">
          {/* Meta */}
          <div className="privacy-meta">
            <div className="meta-company">Valour Watches</div>
            <div className="meta-updated">
              <strong>Last updated:</strong> January 2026
            </div>
          </div>

          {/* Section 1 */}
          <div className="privacy-section">
            <h2 className="section-heading">1. Warranty Coverage</h2>
            <p className="section-text">
              Valour Watches provides a <strong>24-month Limited Manufacturer's Warranty</strong> from the date of delivery, covering defects in materials and workmanship under normal use.
            </p>
            <p className="section-text">
              (Extended warranty programs, if offered, will be disclosed separately.)
            </p>
          </div>

          {/* Section 2 */}
          <div className="privacy-section">
            <h2 className="section-heading">2. What Is Covered</h2>
            <ul className="privacy-list">
              <li>Movement defects</li>
              <li>Manufacturing faults</li>
              <li>Dial, hands, and case defects not caused by misuse</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="privacy-section">
            <h2 className="section-heading">3. What Is Not Covered</h2>
            <p className="section-text">
              The warranty does <strong>not</strong> cover:
            </p>
            <ul className="privacy-list">
              <li>Normal wear and aging</li>
              <li>Scratches, dents, or cosmetic damage</li>
              <li>Damage caused by accidents, misuse, or abuse</li>
              <li>Water damage due to improper use or unsecured crowns</li>
              <li>Unauthorized repairs or modifications</li>
              <li>Straps, clasps, or consumable components</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="privacy-section">
            <h2 className="section-heading">4. Water Resistance</h2>
            <p className="section-text">
              Water resistance ratings are tested at the factory but are <strong>not permanent</strong> and may degrade over time. Regular servicing is recommended.
            </p>
          </div>

          {/* Section 5 */}
          <div className="privacy-section">
            <h2 className="section-heading">5. Warranty Claims</h2>
            <p className="section-text">
              To submit a warranty claim:
            </p>
            <ul className="privacy-list">
              <li>Email <a href="mailto:support@valourwatch.com">support@valourwatch.com</a></li>
              <li>Provide proof of purchase and photos/videos</li>
              <li>Await authorization before shipping</li>
            </ul>
            <p className="section-text">
              Unauthorized shipments may be refused.
            </p>
          </div>

          {/* Section 6 */}
          <div className="privacy-section">
            <h2 className="section-heading">6. Shipping for Warranty Service</h2>
            <ul className="privacy-list">
              <li>Customer is responsible for shipping to Valour</li>
              <li>Valour covers return shipping after repair or replacement</li>
              <li>International customers are responsible for customs fees</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div className="privacy-section">
            <h2 className="section-heading">7. Remedies</h2>
            <p className="section-text">
              At our discretion, Valour will:
            </p>
            <ul className="privacy-list">
              <li>Repair the watch</li>
              <li>Replace the watch with an equivalent model</li>
              <li>Refund the purchase price if repair or replacement is not feasible</li>
            </ul>
          </div>

          {/* Section 8 */}
          <div className="privacy-section">
            <h2 className="section-heading">8. Limitation</h2>
            <p className="section-text">
              This warranty is the sole and exclusive warranty provided and replaces all other warranties, express or implied.
            </p>
          </div>
        </div>
      <Footer />
    </>
  );
};

export default WarrantyPolicy;