'use client';

import React, { useState } from 'react';

const testimonials = [
  {
    name: 'Amara Teshome',
    role: 'Regular Customer',
    text: 'I am very pleased with GreenHarvest. Not only does it serve my needs as a customer, but it is also committed to improving the welfare of local farmers and driving economic growth in the agricultural sector. This is very important.',
    rating: 5,
    avatar: '🧑‍🌾',
  },
  {
    name: 'James Kebede',
    role: 'Restaurant Owner',
    text: 'The search and category filters make it incredibly easy to find exactly what I need. The order tracking gives me peace of mind knowing when my produce will arrive. Highly recommended for any food business.',
    rating: 5,
    avatar: '👨‍🍳',
  },
  {
    name: 'Sara Mulugeta',
    role: 'Health Enthusiast',
    text: 'Finally, a trustworthy platform for organic produce! The review system helps me pick the best products, and the delivery is always on time. The quality is consistently excellent.',
    rating: 5,
    avatar: '👩‍⚕️',
  },
];

const Testimonials: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const t = testimonials[current];

  return (
    <section className="py-20 px-gutter max-w-container-max mx-auto bg-surface relative overflow-hidden mb-section-gap" id="testimonials">
      <div className="absolute top-12 right-20 text-tertiary-container animate-pulse opacity-50">
         <span className="material-symbols-outlined text-6xl">spark</span>
      </div>

      <div className="text-center mb-16">
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">
          What They <span className="bg-secondary-container px-2 rounded-sm inline-block -rotate-2">Say</span>
        </h2>
      </div>

      <div className="max-w-3xl mx-auto bg-surface-container-lowest rounded-3xl p-10 md:p-14 shadow-[0_10px_40px_rgba(0,0,0,0.03)] text-center">
        {/* Avatar */}
        <div className="w-24 h-24 mx-auto mb-8 bg-secondary-container/20 rounded-full inline-flex items-center justify-center text-5xl shadow-sm border-4 border-surface-container-lowest">
          {t.avatar}
        </div>

        {/* Quote */}
        <p className="font-headline-md text-[24px] md:text-[32px] leading-relaxed mb-10 text-on-surface-variant">
          &ldquo;{t.text}&rdquo;
        </p>

        {/* Stars */}
        <div className="flex justify-center gap-1 mb-4">
          {[...Array(t.rating)].map((_, i) => (
            <span key={i} className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          ))}
        </div>

        {/* Name */}
        <p className="font-body-lg text-body-lg text-on-background">{t.name}</p>
        <p className="font-body-md text-body-md text-primary">{t.role}</p>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-10">
          <button
            onClick={() => setCurrent((current - 1 + testimonials.length) % testimonials.length)}
            className="w-12 h-12 rounded-full border-2 border-surface-variant flex items-center justify-center text-on-surface-variant hover:bg-on-background hover:text-on-primary hover:border-on-background transition-all"
            aria-label="Previous testimonial"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <button
            onClick={() => setCurrent((current + 1) % testimonials.length)}
            className="w-12 h-12 rounded-full bg-on-background text-on-primary flex items-center justify-center hover:bg-surface-tint transition-all"
            aria-label="Next testimonial"
          >
            <span className="material-symbols-outlined">arrow_forward_ios</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
