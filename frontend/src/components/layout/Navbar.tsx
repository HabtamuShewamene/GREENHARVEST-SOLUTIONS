'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 flex justify-between items-center px-gutter py-4 w-full max-w-container-max mx-auto left-0 right-0 bg-background/80 dark:bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
        <span className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">GreenHarvest</span>
      </div>
      <div className="hidden md:flex gap-8 items-center">
        <Link href="/products" className="font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors duration-200">
          Products
        </Link>
        <Link href="/categories" className="font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors duration-200">
          Categories
        </Link>
        <Link href="/login" className="font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors duration-200">
          Log In
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/register" className="bg-on-background text-on-primary font-label-lg text-label-lg px-6 py-2 rounded-full hover:bg-surface-tint transition-all duration-150 active:scale-95">
          Register
        </Link>
        <button 
          className="md:hidden flex items-center text-on-surface-variant"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-surface-container-lowest shadow-xl border-t border-outline-variant md:hidden">
          <div className="flex flex-col p-4 gap-4">
            <Link href="/products" className="font-label-lg text-label-lg text-on-surface" onClick={() => setMobileMenuOpen(false)}>Products</Link>
            <Link href="/categories" className="font-label-lg text-label-lg text-on-surface" onClick={() => setMobileMenuOpen(false)}>Categories</Link>
            <Link href="/login" className="font-label-lg text-label-lg text-on-surface" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
