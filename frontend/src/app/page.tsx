/**
 * Landing Page - Homepage
 * Search-focused hero with categories and featured products
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Truck, Shield, ArrowRight } from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';

export default function HomePage() {
  const categories = [
    { id: 1, name: 'Vegetables', icon: '🥬', count: 120 },
    { id: 2, name: 'Fruits', icon: '🍎', count: 85 },
    { id: 3, name: 'Grains & Cereals', icon: '🌾', count: 45 },
    { id: 4, name: 'Dairy Products', icon: '🥛', count: 32 },
    { id: 5, name: 'Organic Products', icon: '🌱', count: 78 },
    { id: 6, name: 'Herbs & Spices', icon: '🌿', count: 56 },
  ];

  const featuredProducts = [
    {
      id: 1,
      name: 'Fresh Organic Tomatoes',
      price: 4.99,
      farmer: 'Green Valley Farm',
      image: '/placeholder-product.jpg',
      rating: 4.8,
    },
    {
      id: 2,
      name: 'Sweet Strawberries',
      price: 6.99,
      farmer: 'Berry Fields',
      image: '/placeholder-product.jpg',
      rating: 4.9,
    },
    {
      id: 3,
      name: 'Organic Spinach',
      price: 3.49,
      farmer: 'Sunshine Farms',
      image: '/placeholder-product.jpg',
      rating: 4.7,
    },
    {
      id: 4,
      name: 'Fresh Carrots',
      price: 2.99,
      farmer: 'Root & Harvest',
      image: '/placeholder-product.jpg',
      rating: 4.6,
    },
  ];

  const stats = [
    { label: 'Active Farmers', value: '500+' },
    { label: 'Fresh Products', value: '2,000+' },
    { label: 'Happy Customers', value: '10,000+' },
    { label: 'Daily Deliveries', value: '1,500+' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-background py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-heading text-5xl md:text-6xl font-bold text-primary mb-6">
              Fresh Farm Products
              <span className="block text-cta">Direct to Your Door</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Connect with local farmers and enjoy fresh, sustainable agricultural products
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <input
                type="text"
                placeholder="Search for fresh vegetables, fruits, dairy..."
                className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent shadow-lg"
              />
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <Button
                variant="primary"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                Search
              </Button>
            </div>

            {/* Popular Searches */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-sm text-gray-600">Popular:</span>
              {['Tomatoes', 'Organic Vegetables', 'Fresh Fruits', 'Dairy'].map((term) => (
                <button
                  key={term}
                  className="text-sm text-primary hover:text-primary-700 underline"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600">
              Explore our wide range of fresh agricultural products
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/categories/${category.id}`}>
                <Card hover className="text-center">
                  <div className="text-5xl mb-3">{category.icon}</div>
                  <h3 className="font-heading font-semibold text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600">{category.count} products</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="font-heading text-4xl font-bold text-gray-900 mb-2">
                Featured Products
              </h2>
              <p className="text-lg text-gray-600">
                Fresh picks from our trusted farmers
              </p>
            </div>
            <Link href="/products">
              <Button variant="outline">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card hover padding="none">
                  <div className="aspect-square bg-gray-200 rounded-t-3xl"></div>
                  <div className="p-4">
                    <h3 className="font-heading font-semibold text-lg text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{product.farmer}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        ${product.price}
                      </span>
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span className="text-sm text-gray-600">{product.rating}</span>
                      </div>
                    </div>
                    <Button variant="primary" size="sm" fullWidth className="mt-3">
                      Add to Cart
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">
              Why Choose GreenHarvest?
            </h2>
            <p className="text-lg text-gray-600">
              Your trusted marketplace for fresh, sustainable products
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-gray-900 mb-2">
                Verified Farmers
              </h3>
              <p className="text-gray-600">
                All our farmers are verified and follow sustainable farming practices
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-cta-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-cta" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-gray-900 mb-2">
                Fast Delivery
              </h3>
              <p className="text-gray-600">
                Fresh products delivered to your door within 24 hours
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-gray-900 mb-2">
                Quality Guaranteed
              </h3>
              <p className="text-gray-600">
                100% satisfaction guarantee or your money back
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-primary text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="font-heading text-4xl md:text-5xl font-bold mb-2">
                  {stat.value}
                </div>
                <div className="text-primary-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Shopping?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of happy customers enjoying fresh farm products
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button variant="primary" size="lg">
                Browse Products
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg">
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
