'use client';

import React from 'react';
import Link from 'next/link';

const CTABanner: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-surface-container-low pt-24 pb-28 px-gutter mb-section-gap max-w-container-max mx-auto rounded-[40px] border border-surface-container-highest shadow-[0_10px_40px_rgba(0,0,0,0.03)]" id="cta">
      {/* Decorative */}
      <div className="absolute top-10 left-10 text-tertiary-container animate-pulse opacity-50">
         <span className="material-symbols-outlined text-8xl">spark</span>
      </div>

      <div className="absolute bottom-10 right-10 text-primary opacity-20">
        <svg fill="currentColor" height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0L55 45L100 50L55 55L50 100L45 55L0 50L45 45L50 0Z"></path>
        </svg>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="font-headline-lg text-[40px] md:text-[64px] text-on-background mb-6 leading-tight">
          Join Us, <span className="text-primary">Empower</span>
          <br />
          Local <span className="bg-secondary-container text-on-background px-2 rounded-sm inline-block -rotate-1">Farmers</span>
        </h2>

        <p className="font-body-lg text-body-lg text-on-surface-variant mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
          Whether you&apos;re a buyer seeking fresh produce, a farmer looking to reach more customers, or a delivery partner — there&apos;s a place for you.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-surface-tint text-on-primary font-label-lg text-label-lg px-10 py-5 rounded-full transition-all duration-200 shadow-[0_10px_40px_rgba(40,108,0,0.4)] hover:-translate-y-1">
            Get Started <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
          <Link href="/products" className="inline-flex items-center justify-center gap-2 bg-surface-variant hover:bg-surface-container-lowest text-on-surface font-label-lg text-label-lg px-10 py-5 rounded-full transition-all duration-200">
            Browse Products
          </Link>
        </div>

        {/* Role badges */}
        <div className="flex flex-wrap justify-center gap-4 mt-16">
          {['Buyer', 'Farmer', 'Delivery Partner'].map((role) => (
            <span key={role} className="px-5 py-2 rounded-full bg-surface-container-highest text-on-surface font-label-md text-label-md border border-surface-variant">
              {role}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
