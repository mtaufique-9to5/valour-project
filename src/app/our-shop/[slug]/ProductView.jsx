// src/app/p-details/[slug]/ProductView.jsx
"use client";
import { useSelector } from "react-redux";
import HeroSection from "../components/HeroSection";
import DetailSec from "../components/DetailSec";
import DetailSec2 from "../components/DetailSec2";
import DetailSec3 from "../components/DetailSec3";
import ParraSec1 from "../components/ParraSec1";
import ParraSec2 from "../components/ParraSec2";
import StrapSec from "../components/StrapSec";
import "./pdetails.css";
import "@/app/globals.css";
import PageTransition from "@/components/PageTransition";
import ScrollProvider from "@/components/ScrollProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProductView({ slug }) {
  const product = useSelector((state) =>
    state.product.value.find((p) => p.slug === slug)
  );

  if (!product) {
    return <div style={{ padding: 40, color: "#fff" }}>Product not found</div>;
  }

  return (
    <div
      className="min-h-full flex flex-col home"
      style={{ overflow: "hidden", height: "100vh", "--accent": product.accent }}
    >
      <PageTransition />
      <ScrollProvider>
        <Header />
        <div className="snap-section"><HeroSection product={product} /></div>
        <div className="snap-section"><DetailSec product={product} /></div>
        <div className="snap-section"><ParraSec1 product={product} /></div>
        <div className="snap-section"><DetailSec2 product={product} /></div>
        <div className="snap-section"><ParraSec2 product={product} /></div>
        <div className="snap-section"><DetailSec3 product={product} /></div>
        <div className="snap-section"><StrapSec product={product} /></div>
        <div className="snap-section"><Footer /></div>
      </ScrollProvider>
    </div>
  );
}