/**
 * Navbar Component
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Bell, Menu, X, User, Leaf } from 'lucide-react';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAuthenticated = false;
  const cartItemCount = 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? 'glass shadow-md' : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg text-stone-900 hidden sm:block">
              Green<span className="text-violet-600">Harvest</span>
            </span>
          </Link>

          {/* Search — Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search fresh products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-100 border border-transparent rounded-xl text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all duration-200"
              />
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/products" className="text-stone-600 hover:text-violet-700 hover:bg-violet-50 font-medium text-sm px-3 py-2 rounded-xl transition-all duration-200">
              Products
            </Link>
            <Link href="/categories" className="text-stone-600 hover:text-violet-700 hover:bg-violet-50 font-medium text-sm px-3 py-2 rounded-xl transition-all duration-200">
              Categories
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-1 ml-2">
                <button className="relative p-2 text-stone-500 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-all duration-200" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                </button>
                <Link href="/cart" className="relative p-2 text-stone-500 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-all duration-200" aria-label="Cart">
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ring-2 ring-white">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard" className="p-2 text-stone-500 hover:text-violet-700 hover:bg-violet-50 rounded-xl transition-all duration-200" aria-label="Profile">
                  <User className="w-5 h-5" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link href="/login" className="text-stone-600 hover:text-violet-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-violet-50 transition-all duration-200">
                  Login
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-4">
                  Sign Up
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile: cart + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && (
              <Link href="/cart" className="relative p-2 text-stone-500" aria-label="Cart">
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            )}
            <button
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-100 border border-transparent rounded-xl text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:border-violet-300 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-100 bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-4 space-y-1">
            {[
              { href: '/products', label: 'Products' },
              { href: '/categories', label: 'Categories' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block text-stone-700 hover:text-violet-700 hover:bg-violet-50 font-medium py-2.5 px-3 rounded-xl transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                <Link href="/cart" className="block text-stone-700 hover:text-violet-700 hover:bg-violet-50 font-medium py-2.5 px-3 rounded-xl transition-all" onClick={() => setMobileMenuOpen(false)}>
                  Cart {cartItemCount > 0 && `(${cartItemCount})`}
                </Link>
                <Link href="/dashboard" className="block text-stone-700 hover:text-violet-700 hover:bg-violet-50 font-medium py-2.5 px-3 rounded-xl transition-all" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-3 border-t border-stone-100 mt-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full btn-outline py-2.5 text-sm">Login</button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full btn-primary py-2.5 text-sm">Sign Up Free</button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
