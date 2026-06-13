/**
 * Products Listing Page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '@/components/features/ProductCard';
import { api } from '@/lib/api';
import type { Product, Category } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts({
        category_id: selectedCategory || undefined,
        search: searchQuery || undefined,
        sort: sortBy,
      });
      setProducts(response.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.getCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await api.addToCart(productId.toString(), 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== null || sortBy !== 'newest';

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-cta-600 font-semibold text-sm uppercase tracking-widest mb-2">Marketplace</p>
          <h1 className="font-heading text-4xl font-bold text-stone-900 mb-1">Fresh Products</h1>
          <p className="text-stone-500 text-lg">Discover seasonal produce from verified local farmers</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Search + Sort ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, farmers, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-700 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all shadow-sm cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`md:hidden flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all shadow-sm ${
              showFilters
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-stone-700 border-stone-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* ── Category Pills ────────────────────────────────── */}
        <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-wrap gap-2 mb-6`}>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
              selectedCategory === null
                ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-violet-300 hover:text-violet-600'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-violet-300 hover:text-violet-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── Results Bar ───────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-stone-500 text-sm">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
                Loading products...
              </span>
            ) : (
              <span><span className="font-semibold text-stone-800">{products.length}</span> products found</span>
            )}
          </p>
          {hasActiveFilters && !loading && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* ── Products Grid ─────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 skeleton rounded-xl w-3/4" />
                  <div className="h-3 skeleton rounded-xl w-1/2" />
                  <div className="h-8 skeleton rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-9 h-9 text-stone-400" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-stone-900 mb-2">No products found</h3>
            <p className="text-stone-500 mb-8 max-w-sm mx-auto">
              Try adjusting your search terms or removing some filters to see more results.
            </p>
            <button onClick={clearFilters} className="btn-primary">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}

        {/* ── Load More ─────────────────────────────────────── */}
        {!loading && products.length > 0 && (
          <div className="mt-14 text-center">
            <button className="btn-outline py-3 px-10">
              Load More Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
