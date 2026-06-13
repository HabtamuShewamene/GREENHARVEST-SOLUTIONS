'use client';

import React from 'react';
import Image from 'next/image';

const HeroSection: React.FC = () => {
  return (
    <section className="max-w-container-max mx-auto px-gutter relative flex flex-col lg:flex-row items-center gap-8 mb-section-gap">
      <div className="w-full lg:w-1/2 relative z-10">
        <div className="absolute -top-10 -left-10 text-primary-fixed sparkle-icon opacity-50">
          <span className="material-symbols-outlined text-6xl">spark</span>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-2">Leading</h2>
        <h1 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl text-on-background uppercase leading-none mb-4">
          Agritech <span className="text-primary-container">And</span><br/>
          <span className="bg-secondary-container text-on-background px-2 pb-2 inline-block -rotate-2 origin-bottom-left rounded-sm mt-2">E-Groceries</span>
        </h1>
        <div className="relative mt-12 mb-8 inline-block">
          <div className="absolute -top-8 right-0 rotate-[15deg]">
            <svg fill="none" height="40" viewBox="0 0 40 40" width="40" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 25C15 15 25 10 35 15" stroke="#fae100" strokeLinecap="round" strokeWidth="4"></path>
              <path d="M25 5L35 15L25 25" stroke="#fae100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
            </svg>
          </div>
          <div className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-tertiary-container flex items-center gap-2">
            <span>&gt;100,000</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mt-2">Customers served and real farmers connected directly</p>
        </div>
        <div className="absolute -bottom-16 right-0 md:right-20 w-32 h-32 bg-tertiary-container rounded-full flex items-center justify-center rotate-12 shadow-[0_10px_40px_rgba(255,123,81,0.3)] z-20">
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="absolute w-28 h-28 animate-[spin_10s_linear_infinite]" viewBox="0 0 100 100">
              <path d="M 50 50 m -35 0 a 35 35 0 1 1 70 0 a 35 35 0 1 1 -70 0" fill="transparent" id="curve"></path>
              <text className="text-[12px] font-bold fill-on-primary tracking-widest uppercase">
                <textPath href="#curve">Let's Farming · Let's Farming · Let's Farming ·</textPath>
              </text>
            </svg>
            <span className="material-symbols-outlined text-4xl text-on-primary -rotate-45">arrow_upward</span>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 relative h-[500px] md:h-[600px] flex items-center justify-center">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-10 text-tertiary-container animate-pulse">
          <svg fill="currentColor" height="80" viewBox="0 0 100 100" width="80" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 0L55 45L100 50L55 55L50 100L45 55L0 50L45 45L50 0Z"></path>
          </svg>
        </div>
        {/* Main Image Container */}
        <div className="absolute inset-0 bg-surface-container-low rounded-[40px] md:rounded-[80px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.05)] transform rotate-[-2deg]">
          <Image src="/ethiopian-hero.png" alt="Ethiopian farmer tending to crops" fill className="object-cover transform rotate-[2deg] scale-110" priority />
        </div>
        {/* Floating Element */}
        <div className="absolute -left-10 md:left-0 top-1/4 w-24 h-64 bg-surface-container-lowest rounded-full p-2 shadow-lg flex flex-col items-center justify-end z-20">
          <Image src="/ethiopian-portrait.png" alt="Small farmer portrait" width={80} height={80} className="rounded-full mb-4 border-4 border-surface-container-lowest object-cover shadow-sm" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
