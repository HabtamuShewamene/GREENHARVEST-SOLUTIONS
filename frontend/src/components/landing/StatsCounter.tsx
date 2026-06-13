'use client';

import React, { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 2000, suffix: '+', label: 'Agricultural Products', sublabel: 'Channeled into a solid supplier network' },
  { value: 100000, suffix: '+', label: 'Satisfied Customers', sublabel: 'One step closer to farm-fresh living' },
  { value: 500, suffix: '+', label: 'Verified Farmers', sublabel: 'Building sustainable communities' },
];

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

const StatItem: React.FC<{ value: number; suffix: string; label: string; sublabel: string; started: boolean }> = ({ value, suffix, label, sublabel, started }) => {
  const count = useCountUp(value, 2200, started);
  const display = count.toLocaleString('en-US');
  
  return (
    <div className="text-center px-4">
      <div className="font-headline-xl text-headline-xl text-primary-container mb-2 leading-none">
        {display}<span className="text-secondary-container">{suffix}</span>
      </div>
      <p className="font-body-lg text-body-lg text-on-background mb-1">{label}</p>
      <p className="font-body-md text-body-md text-on-surface-variant">{sublabel}</p>
    </div>
  );
};

const StatsCounter: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-20 px-gutter relative overflow-hidden mb-section-gap bg-surface-container-lowest max-w-container-max mx-auto rounded-[40px] shadow-sm border border-surface-container">
      {/* Decorative */}
      <div className="absolute top-8 right-12 text-tertiary-container opacity-20">
        <span className="material-symbols-outlined text-6xl">spark</span>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {stats.map((s) => (
            <StatItem key={s.label} {...s} started={visible} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;
