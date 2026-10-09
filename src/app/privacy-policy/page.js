"use client"
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import React from 'react';
import "./privacy.css"

const PrivacyPolicy = () => {
  return (
    <>
    <Header />


        {/* Hero */}
        <div className="privacy-hero">
            <div className="container">
          <span className="privacy-label">Legal</span>
          <h1 className="privacy-title">Privacy Policy</h1>
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
            <p className="meta-intro">
              Valour Watches ("Valour," "we," "us," or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit <a href="https://valourwatch.com">https://valourwatch.com</a>.
            </p>
          </div>

          {/* Section 1 */}
          <div className="privacy-section">
            <h2 className="section-heading">1. Information We Collect</h2>
            <span className="section-subheading">1.1 Personal Information You Provide</span>
            <p className="section-text">We may collect personal information when you:</p>
            <ul className="privacy-list">
              <li>Place an order or pre-order</li>
              <li>Participate in a crowdfunding campaign</li>
              <li>Subscribe to our mailing list</li>
              <li>Contact customer support</li>
            </ul>
            <p className="section-text">This may include:</p>
            <ul className="privacy-list">
              <li>Full name</li>
              <li>Email address</li>
              <li>Shipping and billing address</li>
              <li>Phone number</li>
              <li>Order and payment metadata (processed by third parties)</li>
            </ul>

            <span className="section-subheading">1.2 Automatically Collected Information</span>
            <p className="section-text">When you visit our website, we may automatically collect:</p>
            <ul className="privacy-list">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Operating system</li>
              <li>Pages visited and usage data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="privacy-section">
            <h2 className="section-heading">2. Legal Bases for Processing (GDPR – Article 6)</h2>
            <p className="section-text">If you are located in the European Economic Area (EEA) or United Kingdom, we process your personal data under the following legal bases:</p>
            <ul className="privacy-list">
              <li><strong>Contractual necessity</strong> – to fulfill orders, pre-orders, and warranty obligations</li>
              <li><strong>Consent</strong> – for marketing communications and optional cookies</li>
              <li><strong>Legal obligation</strong> – for accounting, tax, and regulatory compliance</li>
              <li><strong>Legitimate interests</strong> – to improve our website, prevent fraud, and operate our business efficiently</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="privacy-section">
            <h2 className="section-heading">3. How We Use Your Information</h2>
            <p className="section-text">We use personal information to:</p>
            <ul className="privacy-list">
              <li>Process orders, pre-orders, and payments</li>
              <li>Fulfill shipping and delivery</li>
              <li>Provide customer support and warranty service</li>
              <li>Communicate order updates and service notices</li>
              <li>Send marketing communications (opt-out available)</li>
              <li>Improve website functionality and performance</li>
              <li>Detect fraud and ensure platform security</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="privacy-section">
            <h2 className="section-heading">4. Payment Processing</h2>
            <p className="section-text">
              Payments are processed by secure third-party providers (such as Stripe or crowdfunding platforms). Valour Watches <strong>does not store full credit card numbers or CVV data</strong>.
            </p>
          </div>

          {/* Section 5 */}
          <div className="privacy-section">
            <h2 className="section-heading">5. Cookies & Tracking Technologies</h2>
            <p className="section-text">We use cookies and similar technologies to:</p>
            <ul className="privacy-list">
              <li>Enable essential website functionality</li>
              <li>Analyze traffic and user behavior</li>
              <li>Improve performance and user experience</li>
            </ul>
            <p className="section-text">You may manage or disable cookies through your browser settings. Disabling cookies may affect site functionality.</p>
          </div>

          {/* Section 6 */}
          <div className="privacy-section">
            <h2 className="section-heading">6. Sharing of Personal Information</h2>
            <p className="section-text">We may share personal information with trusted third parties solely as necessary to:</p>
            <ul className="privacy-list">
              <li>Process payments</li>
              <li>Fulfill orders and shipments</li>
              <li>Provide website hosting and analytics</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="section-text">We <strong>do not sell personal information</strong>.</p>
          </div>

          {/* Section 7 */}
          <div className="privacy-section">
            <h2 className="section-heading">7. International Data Transfers</h2>
            <p className="section-text">
              Your personal data may be transferred to and processed in countries outside your country of residence, including the United States. Where required, such transfers are protected using appropriate safeguards, such as standard contractual clauses.
            </p>
          </div>

          {/* Section 8 */}
          <div className="privacy-section">
            <h2 className="section-heading">8. Data Retention</h2>
            <p className="section-text">We retain personal information only for as long as necessary to:</p>
            <ul className="privacy-list">
              <li>Fulfill the purposes outlined in this policy</li>
              <li>Comply with legal, accounting, and tax requirements</li>
              <li>Resolve disputes and enforce agreements</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div className="privacy-section">
            <h2 className="section-heading">9. Your Rights (GDPR & UK GDPR)</h2>
            <p className="section-text">If you are located in the EEA or UK, you have the right to:</p>
            <ul className="privacy-list">
              <li>Access your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion ("right to be forgotten")</li>
              <li>Restrict or object to processing</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time (without affecting prior processing)</li>
            </ul>
            <p className="section-text">
              Requests may be submitted to <a href="mailto:support@valourwatch.com">support@valourwatch.com</a>.
            </p>
          </div>

          {/* Section 10 */}
          <div className="privacy-section">
            <h2 className="section-heading">10. California Privacy Rights (CCPA / CPRA)</h2>
            <p className="section-text">If you are a California resident, you have the right to:</p>
            <ul className="privacy-list">
              <li>Know what personal information we collect and why</li>
              <li>Request access to your personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the sale or sharing of personal information (we do not sell data)</li>
              <li>Not be discriminated against for exercising your rights</li>
            </ul>
            <p className="section-text">
              To exercise your rights, contact <a href="mailto:support@valourwatch.com">support@valourwatch.com</a> with the subject line: <strong>"California Privacy Request"</strong>
            </p>
          </div>

          {/* Section 11 */}
          <div className="privacy-section">
            <h2 className="section-heading">11. Marketing Communications</h2>
            <p className="section-text">You may opt out of marketing emails at any time by:</p>
            <ul className="privacy-list">
              <li>Clicking the "unsubscribe" link in emails</li>
              <li>Contacting us at <a href="mailto:support@valourwatch.com">support@valourwatch.com</a></li>
            </ul>
            <p className="section-text">Transactional or service-related communications will still be sent as necessary.</p>
          </div>

          {/* Section 12 */}
          <div className="privacy-section">
            <h2 className="section-heading">12. Data Security</h2>
            <p className="section-text">
              We implement reasonable administrative, technical, and physical safeguards designed to protect personal information. However, no method of transmission over the internet is 100% secure.
            </p>
          </div>

          {/* Section 13 */}
          <div className="privacy-section">
            <h2 className="section-heading">13. Children's Privacy</h2>
            <p className="section-text">
              Our website is not intended for individuals under the age of 18. We do not knowingly collect personal data from minors.
            </p>
          </div>

          {/* Section 14 */}
          <div className="privacy-section">
            <h2 className="section-heading">14. Changes to This Policy</h2>
            <p className="section-text">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised "Last updated" date.
            </p>
          </div>

          {/* Section 15 */}
          <div className="privacy-section">
            <h2 className="section-heading">15. Contact Information</h2>
            <div className="contact-block">
              <div className="contact-name">Valour Watches</div>
              <div className="contact-line">Email: <a href="mailto:support@valourwatch.com">support@valourwatch.com</a></div>
              <div className="contact-line">Website: <a href="https://valourwatch.com">https://valourwatch.com</a></div>
            </div>
          </div>
        </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;