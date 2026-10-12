// src/app/p-details/page.jsx
import HeroSection from "./components/HeroSection";
import DetailSec from "./components/DetailSec";
import DetailSec2 from "./components/DetailSec2";
import DetailSec3 from "./components/DetailSec3";
import ParraSec1 from "./components/ParraSec1";
import ParraSec2 from "./components/ParraSec2";
import "./pdetails.css"
import "../globals.css"
import PageTransition from "@/components/PageTransition";
import ScrollProvider from "@/components/ScrollProvider";
import Header from "@/components/Header";
import StrapSec from "./components/StrapSec";
import Footer from "@/components/Footer";

export default function Page() {
    return (
        <div className="min-h-full flex flex-col home" style={{ overflow: 'hidden', height: '100vh' }}>
            <PageTransition />
            <ScrollProvider>
                <Header />
                <div className="snap-section">
                    <HeroSection />
                </div>
                <div className="snap-section">
                    <DetailSec />
                </div>
                <div className="snap-section">
                    <ParraSec1 />
                </div>
                <div className="snap-section">
                    <DetailSec2 />
                </div>
                <div className="snap-section">
                    <ParraSec2 />
                </div>
                <div className="snap-section">
                    <DetailSec3 />
                </div>
                <div className="snap-section">
                    <StrapSec />
                </div>
                <div className="snap-section">
                    <Footer />
                </div>
            </ScrollProvider>
        </div>
    );
}