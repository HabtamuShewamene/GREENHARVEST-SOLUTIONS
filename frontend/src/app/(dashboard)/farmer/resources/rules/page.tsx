import React from 'react';
import Link from 'next/link';

export default function PlatformRules() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/farmer/dashboard" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-[#2d9a33] shadow-sm mr-4 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Platform Rules & Policies</h1>
            <p className="text-sm text-gray-500 mt-1">Guidelines for maintaining a high-quality marketplace.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm space-y-8">
          <div>
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center mr-3">
                <span className="material-symbols-outlined text-[18px]">block</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Prohibited Items</h2>
            </div>
            <p className="text-gray-600 text-sm ml-11 leading-relaxed">
              Sellers are strictly prohibited from listing chemical pesticides, unauthorized fertilizers, non-agricultural machinery, and expired goods. All produce must meet the freshness standards defined by GreenHarvest.
            </p>
          </div>

          <div className="w-full h-px bg-gray-100"></div>

          <div>
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3">
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Organic Certification</h2>
            </div>
            <p className="text-gray-600 text-sm ml-11 leading-relaxed">
              If you list a product as "Organic", you must have the appropriate verification documents uploaded in your settings. Mislabeling conventionally grown produce as organic will result in immediate account suspension.
            </p>
          </div>

          <div className="w-full h-px bg-gray-100"></div>

          <div>
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mr-3">
                <span className="material-symbols-outlined text-[18px]">timer</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Fulfillment Times</h2>
            </div>
            <p className="text-gray-600 text-sm ml-11 leading-relaxed">
              All orders marked as "Pending" must be confirmed and shipped within 24-48 hours. Repeated failure to fulfill orders on time will lower your seller ranking and visibility in search results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
