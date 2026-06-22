import React from 'react';
import Link from 'next/link';

export default function SellerForum() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] p-8 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px]">forum</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Community Forum</h1>
        <p className="text-gray-500 mb-8">
          We are building a space for farmers to connect, share advice, and discuss market trends. The forum is launching soon!
        </p>
        <Link 
          href="/farmer/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#2d9a33] text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
        >
          <span className="material-symbols-outlined mr-2">arrow_back</span>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
