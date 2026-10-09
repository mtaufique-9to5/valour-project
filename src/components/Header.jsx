'use client'

import React, { useEffect, useRef, useState } from 'react'
import { IoBagHandleOutline, IoSearchOutline } from 'react-icons/io5'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Link from 'next/link'
import { useDispatch } from 'react-redux'
import { toggleCartSidebar } from '@/app/features/cart/cSidebarSlice'
import SidebarMenu from './SidebarMenu'

gsap.registerPlugin(ScrollTrigger)

const Header = () => {
  const dispatch = useDispatch();
  const headerRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    gsap.set(header, { y: -80, opacity: 0 })
    gsap.to(header, { y: 0, opacity: 1, duration: 1.35, delay: 0.35, ease: 'power4.out' })

    const navLinks = header.querySelectorAll('.nav-link, .side-box > *')
    gsap.set(navLinks, { y: -20, opacity: 0 })
    gsap.to(navLinks, {
      y: 0, opacity: 1,
      duration: 0.9, stagger: 0.095, delay: 0.7, ease: 'power3.out',
    })

    const logo = header.querySelector('.navbar-brand')
    if (logo) {
      gsap.set(logo, { scale: 0.7, opacity: 0 })
      gsap.to(logo, { scale: 1, opacity: 1, duration: 1.1, delay: 0.6, ease: 'back.out(2)' })
    }

    const onScroll = () => {
      setScrolled(window.scrollY > 60)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])



  return (
    <header
      ref={headerRef}
      className={`${scrolled ? 'header-scrolled' : ''} ${isSidebarOpen ? "sidebar-opened" : ""}`}
    >
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <div className="r-head">
            <div className="menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <p className="burger-btn"><span></span> <span></span></p>
              <div className="label">Menu</div>
            </div>
            <a href="#" className='search-icon'><IoSearchOutline /></a>
          </div>

          <SidebarMenu isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
          <Link className="navbar-brand" href="/">
            <img src="/images/logo.png" alt="" />
          </Link>
          <div className="side-box">
            <a href="#" className='theme-btn eng'>English</a>
            <p onClick={() => dispatch(toggleCartSidebar(true))}><IoBagHandleOutline /></p>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header
