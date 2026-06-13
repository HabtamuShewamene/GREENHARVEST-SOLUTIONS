'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const categories = [
  { name: 'Fruit', emoji: '🍎', active: true },
  { name: 'Vegetables', emoji: '🥬', active: false },
  { name: 'Grains', emoji: '🌾', active: false },
  { name: 'Herbs', emoji: '🌿', active: false },
  { name: 'Dairy', emoji: '🥛', active: false },
  { name: 'Organic', emoji: '🌱', active: false },
];

const CategoriesShowcase: React.FC = () => {
  return (
    <section className="py-20 px-gutter max-w-container-max mx-auto relative overflow-hidden mb-section-gap" id="categories">
      
      {/* Decorative */}
      <div className="absolute top-12 right-16 text-tertiary-container animate-pulse opacity-50">
        <span className="material-symbols-outlined text-6xl">spark</span>
      </div>

      <div className="text-center mb-10">
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-2 leading-tight">
          Together, <span className="text-primary-container">Harvest</span>
        </h2>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background leading-tight">
          <span className="bg-secondary-container px-2 rounded-sm inline-block -rotate-2">Goodness</span> For Others
        </h2>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            href="/categories"
            className={`px-6 py-3 rounded-full font-label-lg text-label-lg transition-all duration-200 border-2 ${
              cat.active
                ? 'bg-on-background text-on-primary border-on-background'
                : 'bg-surface-container-lowest text-on-surface-variant border-surface-variant hover:border-primary-container hover:text-primary'
            }`}
          >
            {cat.emoji} {cat.name}
          </Link>
        ))}
      </div>

      {/* Produce image */}
      <div className="relative max-w-3xl mx-auto">
        <div className="rounded-[40px] md:rounded-[80px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.05)] relative h-[400px] md:h-[500px]">
          <Image
            src="/produce-showcase.png"
            alt="Fresh organic produce variety"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default CategoriesShowcase;
