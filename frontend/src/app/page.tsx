import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/landing/HeroSection';
import ValueProps from '@/components/landing/ValueProps';
import CategoriesShowcase from '@/components/landing/CategoriesShowcase';
import StatsCounter from '@/components/landing/StatsCounter';
import HowItWorks from '@/components/landing/HowItWorks';
import Testimonials from '@/components/landing/Testimonials';
import CTABanner from '@/components/landing/CTABanner';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-24 md:pt-32 pb-section-gap">
        <HeroSection />
        <ValueProps />
        <CategoriesShowcase />
        <StatsCounter />
        <HowItWorks />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
