'use client';

import React from 'react';
import Image from 'next/image';

const ValueProps: React.FC = () => {
  return (
    <section className="bg-surface-container-low py-20 relative overflow-hidden mb-section-gap">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary-container/20 rounded-l-[100px] -z-10"></div>
      <div className="max-w-container-max mx-auto px-gutter">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 relative">
          <div className="absolute -top-10 -left-10 text-tertiary-container animate-pulse">
            <svg fill="currentColor" height="60" viewBox="0 0 100 100" width="60">
              <path d="M50 0L55 45L100 50L55 55L50 100L45 55L0 50L45 45L50 0Z"></path>
            </svg>
          </div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background max-w-lg leading-tight relative z-10">
            Growing Sense Of Local Farmers
          </h2>
          <div className="relative w-64 h-64 mt-8 md:mt-0 z-10 hidden md:block">
            <div className="absolute -top-10 -left-10 rotate-[-120deg]">
              <svg fill="none" height="60" viewBox="0 0 40 40" width="60" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 25C15 15 25 10 35 15" stroke="#fae100" strokeLinecap="round" strokeWidth="4"></path>
                <path d="M25 5L35 15L25 25" stroke="#fae100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
              </svg>
            </div>
            <div className="w-full h-full bg-surface-container-lowest rounded-full overflow-hidden border-8 border-surface-container-low shadow-xl relative">
              <Image src="/ethiopian-thumbsup.png" alt="Happy Ethiopian farmer giving thumbs up" fill className="object-cover object-top" />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 pt-12 relative shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm">
              <div className="w-12 h-12 bg-secondary-container/20 rounded-full flex items-center justify-center text-tertiary-container">
                <span className="material-symbols-outlined">shopping_basket</span>
              </div>
            </div>
            <h4 className="font-headline-md text-headline-md text-on-background text-center mb-4 text-[24px]">Market Access and Harvest Absorption</h4>
            <p className="font-body-md text-body-md text-on-surface-variant text-center text-sm">Bridging farmers with the market, and creating fair prices for both farmers and consumers</p>
          </div>
          
          {/* Card 2 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 pt-12 relative shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm">
              <div className="w-12 h-12 bg-error-container/50 rounded-full flex items-center justify-center text-tertiary-container">
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>
            <h4 className="font-headline-md text-headline-md text-on-background text-center mb-4 text-[24px]">Secure Payments For Orders</h4>
            <p className="font-body-md text-body-md text-on-surface-variant text-center text-sm">Place orders with secure payment processing and real-time order tracking.</p>
          </div>
          
          {/* Card 3 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 pt-12 relative shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm">
              <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center text-tertiary-container">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
            </div>
            <h4 className="font-headline-md text-headline-md text-on-background text-center mb-4 text-[24px]">Supply Chain Efficient</h4>
            <p className="font-body-md text-body-md text-on-surface-variant text-center text-sm">Supply chain efficiency reduces carbon footprint and maintains fresh crop quality.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueProps;
