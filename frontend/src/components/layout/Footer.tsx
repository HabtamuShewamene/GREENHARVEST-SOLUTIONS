'use client';

import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-on-background dark:bg-surface-container-lowest text-background dark:text-on-background rounded-t-2xl pt-16 pb-8">
      <div className="max-w-container-max mx-auto px-gutter grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="font-headline-md text-headline-md font-bold text-background dark:text-on-background">GreenHarvest</span>
          </div>
          <p className="font-body-md text-body-md text-surface-variant dark:text-on-surface-variant opacity-80 text-sm max-w-xs">GreenHarvest is an innovative platform connecting local farmers and customers in the agricultural sector.</p>
        </div>
        <div className="col-span-1">
          <h5 className="font-label-lg text-label-lg font-bold mb-4">Service</h5>
          <ul className="space-y-3">
            <li><Link href="/products" className="font-label-md text-label-md text-surface-variant dark:text-on-surface-variant hover:text-tertiary-container transition-colors duration-200">Products</Link></li>
            <li><Link href="/categories" className="font-label-md text-label-md text-surface-variant dark:text-on-surface-variant hover:text-tertiary-container transition-colors duration-200">Categories</Link></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h5 className="font-label-lg text-label-lg font-bold mb-4">Company</h5>
          <ul className="space-y-3">
            <li><Link href="/login" className="font-label-md text-label-md text-surface-variant dark:text-on-surface-variant hover:text-tertiary-container transition-colors duration-200">Log In</Link></li>
            <li><Link href="/register" className="font-label-md text-label-md text-surface-variant dark:text-on-surface-variant hover:text-tertiary-container transition-colors duration-200">Register</Link></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h5 className="font-label-lg text-label-lg font-bold mb-4">Social Media</h5>
          <div className="flex gap-4">
            <a className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-tertiary-container transition-colors duration-200" href="#">
              <span className="material-symbols-outlined text-sm">share</span>
            </a>
            <a className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-tertiary-container transition-colors duration-200" href="#">
              <span className="material-symbols-outlined text-sm">flutter_dash</span>
            </a>
            <a className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-tertiary-container transition-colors duration-200" href="#">
              <span className="material-symbols-outlined text-sm">work</span>
            </a>
            <a className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-tertiary-container transition-colors duration-200" href="#">
              <span className="material-symbols-outlined text-sm">photo_camera</span>
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-container-max mx-auto px-gutter pt-8 border-t border-surface-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-6">
          <a className="font-label-md text-label-md text-surface-variant dark:text-on-surface-variant hover:text-tertiary-container transition-colors duration-200" href="#">Privacy Policy</a>
          <a className="font-label-md text-label-md text-surface-variant dark:text-on-surface-variant hover:text-tertiary-container transition-colors duration-200" href="#">Terms of Use</a>
        </div>
        <p className="font-label-md text-label-md text-surface-variant dark:text-on-surface-variant opacity-60">Copyright {new Date().getFullYear()} GreenHarvest Solutions</p>
      </div>
    </footer>
  );
};

export default Footer;
