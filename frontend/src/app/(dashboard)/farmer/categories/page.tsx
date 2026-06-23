'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.getCategories();
      setCategories(res.categories || []);
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-12 h-12 border-4 border-[#2d9a33] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR - preserved from dashboard */}
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-20">
        <div className="h-16 bg-[#2d9a33] flex items-center px-4 text-white">
          <span className="material-symbols-outlined mr-2">agriculture</span>
          <span className="font-bold text-lg tracking-tight">Seller Center</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Core</div>
          <Link href="/farmer/dashboard" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">dashboard</span>
            <span className="text-sm">Overview</span>
          </Link>

          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Products</div>
          <Link href="/farmer/products" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">inventory_2</span>
            <span className="text-sm">Manage Products</span>
          </Link>
          <Link href="/farmer/products/new" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">add_box</span>
            <span className="text-sm">Add New Product</span>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center px-8 flex-shrink-0 z-10 sticky top-0">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Product Categories</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-sm font-bold text-gray-600">ID</th>
                    <th className="p-4 text-sm font-bold text-gray-600">Category Name</th>
                    <th className="p-4 text-sm font-bold text-gray-600">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-500 font-mono">{cat.id}</td>
                      <td className="p-4 text-sm font-bold text-gray-900">{cat.name}</td>
                      <td className="p-4 text-sm text-gray-600">{cat.description || 'No description available.'}</td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-500">No categories found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
