/**
 * Footer Component
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Leaf, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    shop: [
      { label: 'All Products', href: '/products' },
      { label: 'Categories', href: '/categories' },
      { label: 'Our Farmers', href: '/farmers' },
      { label: 'Seasonal Picks', href: '/seasonal' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
    ],
    sellers: [
      { label: 'Start Selling', href: '/sell' },
      { label: 'Farmer Guide', href: '/farmer-guide' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Support', href: '/support' },
    ],
  };

  return (
    <footer className="bg-stone-900 text-stone-300">
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group w-fit">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-lg text-white">
                Green<span className="text-violet-400">Harvest</span>
              </span>
            </Link>
            <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-xs">
              Connecting local farmers with conscious consumers. Fresh, sustainable, and delivered with care.
            </p>

            {/* Contact */}
            <div className="space-y-2.5 text-sm">
              <a href="mailto:hello@greenharvest.com" className="flex items-center gap-2.5 text-stone-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                hello@greenharvest.com
              </a>
              <a href="tel:+15550001234" className="flex items-center gap-2.5 text-stone-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                +1 (555) 000-1234
              </a>
              <div className="flex items-center gap-2.5 text-stone-400">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                123 Farm Road, Green Valley, CA
              </div>
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Shop', items: links.shop },
            { title: 'Company', items: links.company },
            { title: 'For Sellers', items: links.sellers },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-5">{col.title}</h4>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-stone-400 hover:text-white text-sm transition-colors duration-200">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-10 border-t border-stone-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h4 className="font-heading font-semibold text-white mb-1">Stay in the loop</h4>
              <p className="text-stone-400 text-sm">Get weekly updates on fresh arrivals and seasonal offers.</p>
            </div>
            <form className="flex gap-2 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 md:w-64 px-4 py-2.5 bg-stone-800 border border-stone-700 text-white placeholder-stone-500 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              />
              <button type="submit" className="btn-primary text-sm py-2.5 px-5 shrink-0">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-stone-500 text-xs">
            © {currentYear} GreenHarvest Solutions. All rights reserved.
          </p>
          <div className="flex gap-5">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Cookies', href: '/cookies' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="text-stone-500 hover:text-stone-300 text-xs transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
