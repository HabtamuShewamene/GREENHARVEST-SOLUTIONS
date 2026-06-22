'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Product, CartItem } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BuyerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [priceLimit, setPriceLimit] = useState(500);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, cartRes, userRes, notifRes, catRes] = await Promise.all([
        api.getProducts().catch(() => ({ products: [] })),
        api.getCart().catch(() => ({ cart: [] })),
        api.getUserProfile().catch((err) => { console.error("Profile error:", err); return { user: null }; }),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getCategories().catch(() => ({ categories: [] }))
      ]);
      setProducts(productsRes.products || []);
      setCart(cartRes.cart || []);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
      setCategories(catRes.categories || []);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await api.addToCart(productId.toString(), 1);
      const cartRes = await api.getCart();
      setCart(cartRes.cart || []);
      setIsCartOpen(true);
    } catch (error) {
      console.error('Failed to add to cart', error);
    }
  };

  const updateCartQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      try {
        await api.removeFromCart(cartItemId.toString());
      } catch (error) {}
    } else {
      try {
        await api.updateCartItem(cartItemId.toString(), newQuantity);
      } catch (error: any) {
        if (error.response?.data?.message) {
          alert(error.response.data.message);
        } else {
          console.error("Update cart item failed", error);
        }
      }
    }
    try {
      const cartRes = await api.getCart();
      setCart(cartRes.cart || []);
    } catch (e) {}
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const cartSubtotal = cart.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);
  const deliveryFee = cart.length > 0 ? 1.50 : 0;
  const tax = cartSubtotal * 0.05;
  const cartTotal = cartSubtotal + deliveryFee + tax;

  // Dynamically compute max price from loaded products
  const maxPrice = products.length > 0
    ? Math.ceil(Math.max(...products.map(p => Number(p.price) || 0)) * 1.2)
    : 500;

  const filteredProducts = products.filter(p => {
    const matchSearch = (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchPrice = (Number(p.price) || 0) <= priceLimit;
    const matchCategory = selectedCategory ? (p.category_id?.toString() === selectedCategory || p.category?.name === selectedCategory || p.category_name === selectedCategory) : true;
    return matchSearch && matchPrice && matchCategory;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col font-body-md text-on-surface">
      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-4 md:px-8 sticky top-0 z-40">
        <div className="flex items-center justify-between gap-4 md:gap-8 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-[#286c00] flex items-center gap-1.5 tracking-tight shrink-0">
            <span className="material-symbols-outlined text-3xl font-bold">eco</span>
            <span className="font-headline-md tracking-wider">GreenHarvest</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="What are you looking for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#286c00] focus:bg-white transition-all text-sm font-medium placeholder-gray-400"
            />
          </div>

          {/* Actions & Profile */}
          <div className="flex items-center gap-2 md:gap-6 shrink-0">
            <div className="md:hidden flex relative">
               <span className="material-symbols-outlined text-gray-600">search</span>
            </div>
            
            <button className="relative p-1 md:p-2 text-gray-600 hover:text-[#286c00] transition-colors cursor-pointer" onClick={toggleCart}>
              <span className="material-symbols-outlined">shopping_cart</span>
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-[18px] h-[18px] bg-[#ff8296] text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white">{cart.length}</span>
              )}
            </button>
            <button className="relative p-1 md:p-2 text-gray-600 hover:text-[#286c00] transition-colors hidden sm:block cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
              {notifications.filter(n => n.status === 'unread').length > 0 && (
                <span className="absolute top-0 right-0 w-[18px] h-[18px] bg-[#ff8296] text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {notifications.filter(n => n.status === 'unread').length}
                </span>
              )}
            </button>

            <div className="hidden md:block h-8 w-px bg-gray-200"></div>

            <div className="relative">
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="w-8 h-8 rounded-full border border-[#d5edc4] bg-[#f6fdf0] text-[#286c00] flex items-center justify-center font-bold text-xs uppercase shadow-sm group-hover:bg-[#eaf8e0] transition-colors">
                  {user?.name?.substring(0, 2) || 'GH'}
                </div>
                <div className="hidden lg:block text-right leading-tight ml-2">
                  <p className="text-[10px] text-gray-400">Welcome Back!</p>
                  <p className="text-xs font-bold text-gray-800 truncate max-w-[120px]">{user?.name || 'Guest'}</p>
                </div>
                <span className={`material-symbols-outlined text-[18px] text-gray-400 hidden lg:block transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </div>

              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-3 w-48 bg-white border border-gray-100 rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <Link href="/buyer/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#286c00] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    My Profile
                  </Link>
                  <Link href="/buyer/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#286c00] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                    My Orders
                  </Link>
                  <div className="h-px bg-gray-100 my-1"></div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#ff8296] hover:bg-[#fff0f2] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-8 py-6 flex flex-col">
        {/* Hero Banner */}
        <div className="w-full h-[250px] md:h-[350px] bg-gray-200 mb-6 relative overflow-hidden flex items-center justify-center md:justify-start rounded-xl">
          <img src="https://images.unsplash.com/photo-1592841200221-a6898f307baa?q=80&w=2574&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
          <div className="relative z-10 p-8 md:p-16 max-w-2xl text-white md:mr-auto">
            <h2 className="text-5xl md:text-7xl font-bold mb-2 font-headline-md tracking-tight leading-tight">
              Welcome, {user?.name ? user.name.split(' ')[0] : 'Guest'}!
            </h2>
            <h3 className="text-3xl md:text-4xl font-light mb-4">Fresh From Farm</h3>
            <p className="text-lg opacity-90 mt-2 font-medium">100% Organic, direct to your table.</p>
          </div>
          <div 
            onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-6 right-6 md:bottom-12 md:right-12 w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/40 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors backdrop-blur-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
          </div>
        </div>

        {/* Breadcrumbs & Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs md:text-sm text-[#286c00] mb-2 font-medium">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
            <span className="text-gray-500">Produce</span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{filteredProducts.length} result for produce</h3>
        </div>

        <div className="flex gap-10">
          {/* Left Filters */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="flex items-center justify-between mb-4 bg-[#f6fdf0] p-4 rounded-xl border border-[#d5edc4]">
              <h4 className="font-bold text-gray-800 text-[15px]">Filter</h4>
              <button className="text-xs text-[#286c00] font-medium hover:underline">Advanced</button>
            </div>

            {/* Category Filter */}
            <div className="border-b border-gray-100 py-6">
              <div className="flex items-center justify-between mb-4 cursor-pointer group" onClick={() => setSelectedCategory(null)}>
                <h5 className="font-bold text-gray-800 text-[13px]">Category</h5>
                {selectedCategory && <span className="text-xs text-[#286c00] hover:underline">Clear</span>}
              </div>
              <div className="space-y-4 max-h-48 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="category" 
                      checked={selectedCategory === null} 
                      onChange={() => setSelectedCategory(null)}
                      className="w-4 h-4 text-[#286c00] focus:ring-[#286c00]"
                    />
                    <span className={`text-sm ${selectedCategory === null ? 'text-gray-900 font-bold' : 'text-gray-600 font-medium'}`}>All Products</span>
                  </div>
                </label>
                {categories.map((category) => (
                  <label key={category.id || category.category_id || category.category_name || category.name} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="category" 
                        checked={selectedCategory === (category.id?.toString() || category.category_id?.toString() || category.category_name || category.name)} 
                        onChange={() => setSelectedCategory(category.id?.toString() || category.category_id?.toString() || category.category_name || category.name)}
                        className="w-4 h-4 text-[#286c00] focus:ring-[#286c00]"
                      />
                      <span className={`text-sm ${selectedCategory === (category.id?.toString() || category.category_id?.toString() || category.category_name || category.name) ? 'text-gray-900 font-bold' : 'text-gray-600 font-medium'}`}>{category.category_name || category.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="border-b border-gray-100 py-6">
              <div className="flex items-center justify-between mb-4 cursor-pointer group">
                <h5 className="font-bold text-gray-800 text-[13px]">Price</h5>
                <span className="material-symbols-outlined text-gray-400 group-hover:text-gray-600 transition-colors">expand_less</span>
              </div>
              
              {/* Fake Histogram */}
              <div className="flex items-end h-12 gap-[2px] mb-2 px-1">
                {[2, 4, 3, 5, 8, 12, 16, 20, 24, 18, 14, 10, 6, 3, 2].map((h, i) => (
                  <div key={i} className="flex-1 bg-[#d5edc4] rounded-t-sm" style={{ height: `${h * 4}px` }}></div>
                ))}
              </div>

              <div className="px-1 relative">
                <input 
                  type="range" 
                  min="0" 
                  max={maxPrice}
                  value={priceLimit}
                  onChange={(e) => setPriceLimit(Number(e.target.value))}
                  className="w-full h-[3px] bg-[#d5edc4] rounded-full appearance-none outline-none accent-[#286c00] mb-6 absolute top-0 left-0 z-10" 
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-gray-400 font-bold tracking-wider mb-2 mt-4 px-1">
                <span>$0.00</span>
                <span>${maxPrice.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
                  <span className="text-[10px] text-gray-400">Min</span>
                  <p className="text-sm font-bold text-gray-700">$0.00</p>
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
                  <span className="text-[10px] text-gray-400">Max</span>
                  <p className="text-sm font-bold text-[#286c00]">${priceLimit.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <section className="flex-1" id="products-section">
            {/* Top Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="hidden sm:flex gap-1">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className={`p-1.5 rounded-md border transition-colors ${viewMode === 'grid' ? 'bg-[#f6fdf0] text-[#286c00] border-[#d5edc4]' : 'text-gray-400 hover:bg-gray-50 border-transparent'}`}
                 >
                   <span className="material-symbols-outlined text-[20px]">grid_view</span>
                 </button>
                 <button 
                   onClick={() => setViewMode('list')}
                   className={`p-1.5 rounded-md border transition-colors ${viewMode === 'list' ? 'bg-[#f6fdf0] text-[#286c00] border-[#d5edc4]' : 'text-gray-400 hover:bg-gray-50 border-transparent'}`}
                 >
                   <span className="material-symbols-outlined text-[20px]">view_list</span>
                 </button>
              </div>
            </div>

            {/* Grid / List */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6' : 'flex flex-col gap-4'}>
              {loading ? (
                <p className="col-span-full text-center text-gray-500 py-10">Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-500">No products found.</div>
              ) : (
                filteredProducts.map((product) => {
                  const isLowStock = product.stock > 0 && product.stock <= 12;

                  if (viewMode === 'list') {
                    return (
                      <div key={product.id} className="group flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-[#d5edc4] transition-all cursor-pointer" onClick={() => router.push(`/buyer/product/${product.id}`)}>
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🥦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{product.category_name || 'Produce'}</p>
                          <h3 className="text-sm font-bold text-[#1a1c29] group-hover:text-[#286c00] transition-colors truncate">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-base font-bold text-[#286c00]">${Number(product.price).toFixed(2)}</span>
                          {isLowStock ? (
                            <span className="text-[10px] font-bold text-[#ff8296] bg-[#fff0f2] px-1.5 py-0.5 rounded-sm">{product.stock} left!</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{product.stock} in stock</span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product.id); }} className="text-xs font-bold text-white bg-[#286c00] px-3 py-1.5 rounded-lg hover:bg-[#1e5200] transition-colors">
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={product.id} className="group relative flex flex-col cursor-pointer" onClick={() => router.push(`/buyer/product/${product.id}`)}>
                      {/* Image Container */}
                      <div className="w-full aspect-[3/4] bg-[#f8f9fa] rounded-2xl overflow-hidden relative mb-4 border border-gray-100/50">
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-[#286c00] text-white text-[9px] font-bold px-2 py-1 rounded-[4px] tracking-wider flex items-center gap-1 shadow-sm">
                            <span className="text-[10px]">✦</span> New Arrival
                          </span>
                        </div>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-100">🥦</div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex flex-col px-1">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{product.category_name || product.farmer_name || 'Local Farm'}</p>
                        </div>
                        <h3 className="text-[14px] font-bold text-[#1a1c29] leading-snug mb-3 line-clamp-1 group-hover:text-[#286c00] transition-colors">{product.name}</h3>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[15px] font-bold text-[#286c00]">${Number(product.price).toFixed(2)}</span>
                          {isLowStock ? (
                            <span className="text-[10px] font-bold text-[#ff8296] bg-[#fff0f2] px-1.5 py-0.5 rounded-sm">{product.stock} items left!</span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400">{product.stock} in stock</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Slide-out Cart Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-all duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={toggleCart}
      ></div>

      {/* Cart Drawer */}
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#1a1c29] flex items-center gap-2">
            Your Bag
          </h2>
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors" onClick={toggleCart}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-20 flex flex-col items-center">
               <span className="material-symbols-outlined text-6xl mb-4 opacity-30 text-[#286c00]">shopping_bag</span>
               <p className="text-sm font-medium">Your bag is empty.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="w-20 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                  {item.product?.image_url ? (
                    <img alt={item.product.name} className="w-full h-full object-cover" src={item.product.image_url} />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-3xl">🥦</div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-[#1a1c29] leading-tight mb-1">{item.product?.name}</h4>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-3">{item.product?.farmer?.name}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[#286c00]">SAR {Number(item.product?.price || 0).toFixed(2)}</span>
                    <div className="flex items-center gap-3 bg-gray-50 rounded border border-gray-200 px-1 py-0.5">
                      <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="text-gray-400 hover:text-black transition-colors w-6 h-6 flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">remove</span></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="text-gray-400 hover:text-black transition-colors w-6 h-6 flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">add</span></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-500 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-[#1a1c29]">SAR {cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 font-medium">
                <span>Shipping</span>
                <span className="font-bold text-[#1a1c29]">SAR {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#1a1c29] pt-4 border-t border-gray-100">
                <span>Total</span>
                <span className="text-[#286c00]">SAR {cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <button className="w-full py-3.5 bg-[#286c00] text-white rounded-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1e5200] transition-colors shadow-md">
              Checkout Now
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
