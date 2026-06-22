import React from 'react';
import Link from 'next/link';

export default function TrainingHub() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/farmer/dashboard" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-[#2d9a33] shadow-sm mr-4 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Seller Training Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Learn how to maximize your farm's success on GreenHarvest.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Module 1 */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-50 text-[#2d9a33] rounded-lg flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Setting Up Your Store</h3>
            <p className="text-sm text-gray-600 mb-4">Learn how to write great product descriptions, take beautiful photos, and price your items competitively.</p>
            <button className="text-sm font-bold text-[#2d9a33] flex items-center hover:underline">
              Start Module <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
            </button>
          </div>

          {/* Module 2 */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Packaging & Shipping</h3>
            <p className="text-sm text-gray-600 mb-4">Best practices for packing fresh produce to ensure it reaches buyers in perfect condition.</p>
            <button className="text-sm font-bold text-[#2d9a33] flex items-center hover:underline">
              Start Module <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
