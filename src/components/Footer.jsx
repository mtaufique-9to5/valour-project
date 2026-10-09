"use client"
import Link from 'next/link'
import React, { useState } from 'react'
import AppointmentModal from './AppointmentModal'
import IconBox from './IconBox'
import CtaSec from './CtaSec'

const Footer = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    return (
        <section className='footer'>
            <CtaSec />
            <footer>
                <div className="container">
                    <div className="mid-footer">
                        <div className="row">
                            <div className="col-md-4 col-xl-4">
                                <Link href="/"><img src="/images/logo.png" alt="Footer Logo" /></Link>
                                <p className='footer-desc'>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ratione, voluptates? Iusto optio temporibus perspiciatis eligendi ipsam error aspernatur velit quos. Iusto optio temporibus perspiciatis eligendi ipsam error aspernatur velit quos.</p>
                            </div>
                            <div className="col-md-3 col-xl-4">
                                <ul>
                                    <li><Link className='footer-link' href="/">Home</Link></li>
                                    <li><Link className='footer-link' href="/about">About</Link></li>
                                    <li><Link className='footer-link' href="/our-shop">Our Shop</Link></li>
                                    <li><Link className='footer-link' href="/blog">Blog</Link></li>
                                    <li><Link className='footer-link' href="/blog-details">Blog Details</Link></li>
                                    <li><Link className='footer-link' href="/product-details">Product Details</Link></li>
                                </ul>
                            </div>
                            <div className="col-md-5 col-xl-4">
                                <div className="row border-row">
                                    <div className="col-md-6">
                                        <div className="link-box">
                                            <Link className='footer-link2' href="/our-shop">Historical models</Link>
                                            <Link className='footer-link2' href="#">Pre-Owned</Link>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="link-box">
                                            <Link className='footer-link2' href="/servicing">Servicing</Link>
                                            <p className='footer-link2' style={{cursor: "pointer"}} onClick={() => setIsModalOpen(!isModalOpen)}>Book an appointment</p>
                                            <AppointmentModal isModalOpen={isModalOpen} onClose={() => setIsModalOpen(!isModalOpen)}/>
                                        </div>
                                    </div>
                                </div>
                                <div className="row border-row two">
                                    <div className="col-md-6">
                                        <div className="link-box two">
                                            <p className='footer-p'>Follow Us</p>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <IconBox />
                                    </div>
                                </div>
                                <div className="row border-row two border-0">
                                    <div className="col-md-6">
                                        <div className="link-box">
                                            <Link className='footer-link2' href="mailto:info@valourwatches.com">info@valourwatches.com</Link>
                                            <Link className='footer-link2' href="tel:+1 236 598 9866">+1 236 598 9866</Link>
                                            <p className='footer-link2'>24/7 Customer Care</p>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="link-box">
                                            <Link className='footer-link2' href="/client-services">Client Services</Link>
                                            <Link className='footer-link2' href="/purchase-policies">Purchase Policies</Link>
                                            <Link className='footer-link2' href="/watch-warranty">Watch Warranty</Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                        <div className="container">
                            <div className="inner-footer">
                                <p>Copyright @ 2026 Valour Watches-All Right Reserved</p>
                                <div>
                                    <Link href="/privacy-policy">Privacy Policy</Link>&nbsp;-&nbsp;<Link href="/terms-and-conditions">Terms &amp; Conditions</Link>&nbsp;-&nbsp;<Link href="/warranty-policy">Warranty Policy</Link>
                                </div>
                            </div>
                        </div>
                </div>

            </footer>
        </section>
    )
}

export default Footer
