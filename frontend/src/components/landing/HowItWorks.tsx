'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const HowItWorks: React.FC = () => {
  const steps = [
    { num: '01', title: 'Browse & Search', desc: 'Search products by name, category, or price. Filter to find exactly what you need from verified farmers.', icon: 'search' },
    { num: '02', title: 'Add to Cart & Order', desc: 'Add items to your cart, review your selection, and place your order with secure payment processing.', icon: 'shopping_cart' },
    { num: '03', title: 'Track Delivery', desc: 'Follow your order in real-time as our delivery partners bring fresh produce from the farm to your door.', icon: 'local_shipping' },
    { num: '04', title: 'Rate & Review', desc: 'Share your experience by rating products and leaving reviews to help other customers and farmers.', icon: 'star' },
  ];

  return (
    <section className="bg-surface-container-lowest relative overflow-hidden mb-section-gap py-20" id="how-it-works">
      <div className="max-w-container-max mx-auto px-gutter">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Image */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute inset-0 bg-surface-container-low rounded-[40px] rotate-2 scale-105" />
            <div className="relative rounded-[40px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.05)] h-[500px]">
              <Image
                src="/ethiopian-delivery.png"
                alt="Ethiopian delivery driver with fresh produce"
                fill
                className="object-cover"
              />
            </div>
            {/* Floating decorative */}
            <div className="absolute -top-6 -right-6 text-tertiary-container animate-pulse">
               <span className="material-symbols-outlined text-6xl">spark</span>
            </div>
          </div>

          {/* Right: Steps */}
          <div className="order-1 lg:order-2">
            <p className="text-primary-container font-label-lg text-label-lg uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-8 leading-tight">
              From Farm To
              <br />
              <span className="text-primary">Your Table</span>, We
              <br />
              Are Present
            </h2>

            <div className="space-y-8 mt-8">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-6 group">
                  <div className="w-16 h-16 bg-surface border-2 border-surface-container rounded-2xl flex items-center justify-center text-2xl shrink-0 group-hover:bg-primary-container/10 group-hover:border-primary-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">{step.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-[24px] text-on-background mb-1">
                      <span className="text-primary-container mr-3">{step.num}</span>
                      {step.title}
                    </h4>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/register" className="bg-primary hover:bg-surface-tint text-on-primary font-label-lg text-label-lg mt-10 py-4 px-8 rounded-full shadow-lg hover:-translate-y-1 transition-all inline-flex items-center gap-2">
              Join Us <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
