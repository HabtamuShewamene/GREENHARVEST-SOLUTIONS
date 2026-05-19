/**
 * Landing Page - Homepage
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Truck, Shield, ArrowRight, Leaf, Star, ChevronRight } from 'lucide-react';
import Button from '@/components/common/Button';

export default function HomePage() {
  const categories = [
    { id: 1, name: 'Vegetables', emoji: '🥬', count: 120, color: 'from-emerald-50 to-green-100', border: 'border-emerald-200' },
    { id: 2, name: 'Fruits', emoji: '🍎', count: 85, color: 'from-red-50 to-rose-100', border: 'border-rose-200' },
    { id: 3, name: 'Grains', emoji: '🌾', count: 45, color: 'from-amber-50 to-yellow-100', border: 'border-amber-200' },
    { id: 4, name: 'Dairy', emoji: '🥛', count: 32, color: 'from-blue-50 to-sky-100', border: 'border-sky-200' },
    { id: 5, name: 'Organic', emoji: '🌱', count: 78, color: 'from-lime-50 to-green-100', border: 'border-lime-200' },
    { id: 6, name: 'Herbs', emoji: '🌿', count: 56, color: 'from-teal-50 to-emerald-100', border: 'border-teal-200' },
  ];

  const featuredProducts = [
    { id: 1, name: 'Organic Tomatoes', price: 4.99, farmer: 'Green Valley Farm', rating: 4.8, reviews: 124, tag: 'Bestseller' },
    { id: 2, name: 'Sweet Strawberries', price: 6.99, farmer: 'Berry Fields', rating: 4.9, reviews: 89, tag: 'New' },
    { id: 3, name: 'Baby Spinach', price: 3.49, farmer: 'Sunshine Farms', rating: 4.7, reviews: 67, tag: null },
    { id: 4, name: 'Fresh Carrots', price: 2.99, farmer: 'Root & Harvest', rating: 4.6, reviews: 203, tag: null },
  ];

  const stats = [
    { label: 'Active Farmers', value: '500+', icon: '🌾' },
    { label: 'Fresh Products', value: '2,000+', icon: '🥦' },
    { label: 'Happy Customers', value: '10,000+', icon: '😊' },
    { label: 'Daily Deliveries', value: '1,500+', icon: '🚚' },
  ];

  const testimonials = [
    { name: 'Sarah M.', role: 'Home Cook', text: 'The freshest vegetables I\'ve ever had. Delivered same day!', rating: 5 },
    { name: 'James K.', role: 'Restaurant Owner', text: 'Reliable supply of quality produce. My chefs love it.', rating: 5 },
    { name: 'Amara T.', role: 'Health Enthusiast', text: 'Finally found a trustworthy source for organic produce.', rating: 5 },
  ];

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="gradient-hero relative overflow-hidden pt-16 pb-24 px-4">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 border border-violet-200 text-violet-700 text-sm font-semibold px-4 py-2 rounded-full mb-6 shadow-sm">
              <Leaf className="w-4 h-4 text-emerald-500" />
              Farm-to-table, simplified
            </div>

            <h1 className="font-heading text-5xl md:text-7xl font-bold text-stone-900 mb-6 leading-tight">
              Fresh Produce,{' '}
              <span className="gradient-text">Direct from</span>
              <br />the Farm
            </h1>

            <p className="text-xl text-stone-600 mb-10 max-w-xl mx-auto leading-relaxed">
              Skip the middleman. Connect with verified local farmers and get the freshest seasonal produce delivered to your door.
            </p>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <div className="flex items-center bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden p-2 gap-2">
                <Search className="w-5 h-5 text-stone-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search tomatoes, spinach, strawberries..."
                  className="flex-1 py-3 px-2 text-stone-800 placeholder-stone-400 bg-transparent focus:outline-none text-base"
                />
                <button className="btn-primary shrink-0 py-3 px-6 text-sm">
                  Search
                </button>
              </div>
            </div>

            {/* Popular tags */}
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="text-stone-500">Popular:</span>
              {['Tomatoes', 'Organic Veg', 'Strawberries', 'Dairy', 'Herbs'].map((term) => (
                <button key={term} className="text-violet-600 hover:text-violet-800 font-medium hover:underline transition-colors cursor-pointer">
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-14">
            {[
              { icon: '✓', text: 'Verified Farmers' },
              { icon: '⚡', text: '24h Delivery' },
              { icon: '♻️', text: 'Sustainable' },
              { icon: '💯', text: 'Money-back Guarantee' },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-stone-600 text-sm font-medium">
                <span className="text-base">{badge.icon}</span>
                {badge.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container-xl">
          <div className="text-center mb-14">
            <p className="text-cta-600 font-semibold text-sm uppercase tracking-widest mb-3">Browse</p>
            <h2 className="font-heading text-4xl font-bold text-stone-900 mb-4">Shop by Category</h2>
            <div className="divider" />
            <p className="text-stone-500 text-lg mt-4 max-w-md mx-auto">
              Explore our wide range of fresh seasonal produce
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/categories/${cat.id}`}>
                <div className={`group bg-gradient-to-br ${cat.color} border ${cat.border} rounded-3xl p-5 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer`}>
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{cat.emoji}</div>
                  <h3 className="font-heading font-semibold text-stone-800 text-sm mb-1">{cat.name}</h3>
                  <p className="text-xs text-stone-500">{cat.count} items</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────── */}
      <section className="section bg-stone-50">
        <div className="container-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-14 gap-4">
            <div>
              <p className="text-cta-600 font-semibold text-sm uppercase tracking-widest mb-3">Handpicked</p>
              <h2 className="font-heading text-4xl font-bold text-stone-900 mb-2">Featured Products</h2>
              <div className="divider-left" />
              <p className="text-stone-500 mt-3">Fresh picks from our trusted farmers</p>
            </div>
            <Link href="/products" className="btn-outline text-sm py-2.5 px-5 shrink-0">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="group bg-white rounded-3xl shadow-sm hover:shadow-xl border border-stone-100 overflow-hidden hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col">
                  {/* Image placeholder */}
                  <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 relative overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500">
                      🥦
                    </div>
                    {product.tag && (
                      <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${
                        product.tag === 'Bestseller' ? 'bg-amber-400 text-amber-900' : 'bg-violet-500 text-white'
                      }`}>
                        {product.tag}
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-heading font-semibold text-stone-900 mb-1 line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-stone-500 mb-3">{product.farmer}</p>

                    <div className="flex items-center gap-1 mb-4">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-semibold text-stone-700">{product.rating}</span>
                      <span className="text-xs text-stone-400">({product.reviews})</span>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-2xl font-bold text-violet-700">${product.price}</span>
                      <button className="btn-primary text-xs py-2 px-4">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why GreenHarvest ─────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container-xl">
          <div className="text-center mb-14">
            <p className="text-cta-600 font-semibold text-sm uppercase tracking-widest mb-3">Our Promise</p>
            <h2 className="font-heading text-4xl font-bold text-stone-900 mb-4">Why GreenHarvest?</h2>
            <div className="divider" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-7 h-7 text-violet-600" />,
                bg: 'bg-violet-50',
                title: 'Verified Farmers',
                desc: 'Every farmer on our platform is personally verified and follows certified sustainable practices.',
              },
              {
                icon: <Truck className="w-7 h-7 text-emerald-600" />,
                bg: 'bg-emerald-50',
                title: 'Same-Day Delivery',
                desc: 'Harvested in the morning, at your door by evening. We guarantee maximum freshness.',
              },
              {
                icon: <ShoppingBag className="w-7 h-7 text-amber-600" />,
                bg: 'bg-amber-50',
                title: 'Quality Guaranteed',
                desc: 'Not satisfied? We\'ll replace your order or give you a full refund. No questions asked.',
              },
            ].map((item) => (
              <div key={item.title} className="group p-8 rounded-3xl border border-stone-100 hover:border-violet-200 hover:shadow-lg transition-all duration-300">
                <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <h3 className="font-heading text-xl font-bold text-stone-900 mb-3">{item.title}</h3>
                <p className="text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="gradient-stats py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label} className="group">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="font-heading text-4xl md:text-5xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-violet-200 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="section bg-stone-50">
        <div className="container-xl">
          <div className="text-center mb-14">
            <p className="text-cta-600 font-semibold text-sm uppercase tracking-widest mb-3">Reviews</p>
            <h2 className="font-heading text-4xl font-bold text-stone-900 mb-4">What Customers Say</h2>
            <div className="divider" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-stone-600 leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">{t.name}</p>
                    <p className="text-stone-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-violet-50 to-emerald-50 border border-violet-100 rounded-3xl p-12 md:p-16">
            <div className="text-5xl mb-6">🌿</div>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-stone-900 mb-4">
              Ready to Eat Fresh?
            </h2>
            <p className="text-xl text-stone-500 mb-10 max-w-lg mx-auto">
              Join 10,000+ customers who switched to farm-fresh produce.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <button className="btn-primary text-base py-4 px-8">
                  Browse Products <ChevronRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/register">
                <button className="btn-outline text-base py-4 px-8">
                  Become a Seller
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
