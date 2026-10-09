import AboutSec from '@/components/AboutSec'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import React from 'react'
import AuthorsSec from '@/components/AuthorsSec'
import BeliefSec from '@/components/BeliefSec'
import "./about.css"
import "../globals.css"
import PageTransition from '@/components/PageTransition'
import ScrollProvider from '@/components/ScrollProvider'

const About = () => {
    return (
        <div className="min-h-full flex flex-col" style={{ overflow: 'hidden', height: '100vh' }}>
            <PageTransition />
            <ScrollProvider>
                <Header />
                <div className="snap-section">
                    <AboutSec />

                </div>
                <div className="snap-section">
                    <AuthorsSec />

                </div>
                <div className="snap-section">
                    <BeliefSec />

                </div>
                <div className="snap-section">
                    <Footer />

                </div>
            </ScrollProvider>
        </div>
    )
}

export default About
