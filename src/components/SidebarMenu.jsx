import React, { useEffect, useRef, useState } from 'react'
import IconBox from './IconBox';
import AppointmentModal from './AppointmentModal';
import Link from 'next/link';

const SidebarMenu = ({ setIsSidebarOpen, isSidebarOpen }) => {
        const [isModalOpen, setIsModalOpen] = useState(false);
    const ref = useRef();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                ref.current &&
                ref.current.contains(e.target)
            ) {
                setIsSidebarOpen(false);
            }

        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [])
    return (
        <>
            <div className={`side-overlay ${isSidebarOpen ? "active" : ""}`} ref={ref}></div>
            <div className={`sidebar-menu ${isSidebarOpen ? "active" : ""}`}>
                <ul className="link-list">
                    <li><Link href="/" className='hover-link'>Home</Link></li>
                    <li><Link href="/about" className='hover-link'>About</Link></li>
                    <li><Link href="/our-shop" className='hover-link'>Our Shop</Link></li>
                    <li><Link href="/blog" className='hover-link'>Blog</Link></li>
                </ul>
                <div className="link-sec">
                    <div className="row">
                        <div className="col-md-6">
                            <ul>
                                <li><a href="#">Historical models</a></li>
                                <li><a href="#">Pre-Owned</a></li>
                            </ul>
                        </div>
                        <div className="col-md-6">
                            <ul>
                                <li><a href="/servicing">Servicing</a></li>
                                <li><a href="#" onClick={(e) => {
                                    e.preventDefault()
                                    setIsModalOpen(!isModalOpen)
                                }}>Book an appointment</a></li>
                            </ul>
                           
                        </div>
                    </div>
                </div>
                <div className="link-sec two">
                    <div className="row">
                        <div className="col-md-6">
                            <ul>
                                <li><a href="mailto:info@valourwatches.com">info@valourwatches.com</a></li>
                                <li><a href="tel:+1 236 598 9866">+1 236 598 9866</a></li>
                                <li><a href="javascript:void(0)">24/7 Customer Care</a></li>
                            </ul>
                        </div>
                        <div className="col-md-6">
                            <ul>
                                <li><a href="/client-services">Client Services</a></li>
                                <li><a href="/purchase-policies">Purchase Policies</a></li>
                                <li><a href="/watch-warranty">Watch Warranty</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                    <IconBox />
            </div>
             <AppointmentModal isModalOpen={isModalOpen} onClose={() => setIsModalOpen(!isModalOpen)}/>
        </>
    )
}

export default SidebarMenu
