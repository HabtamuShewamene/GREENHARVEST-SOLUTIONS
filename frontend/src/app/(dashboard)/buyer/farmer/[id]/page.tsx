'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/* ── Countdown Timer for Flash Sales ── */
const CountdownTimer = ({ endTime }: { endTime: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(endTime).getTime();
    if (isNaN(target)) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = target - now;
      if (distance < 0) { clearInterval(interval); return; }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex gap-3">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hrs', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Sec', value: timeLeft.seconds }
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-14 h-14 bg-red-500 text-white rounded-lg flex items-center justify-center text-xl font-black shadow-md">
            {item.value.toString().padStart(2, '0')}
          </div>
          <span className="text-[10px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Product Card ── */
const ProductCard = ({ product }: { product: any }) => {
  const hasDiscount = product.discount_price && Number(product.discount_price) > 0 && Number(product.discount_price) < Number(product.price);
  const discountPercent = hasDiscount ? Math.round((1 - Number(product.discount_price) / Number(product.price)) * 100) : 0;

  return (
    <Link href={`/buyer/product/${product.id}`} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#286c00]/30 transition-all group">
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-300 text-4xl">image</span>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
            -{discountPercent}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">{product.name}</p>
        <div className="flex items-baseline gap-1.5">
          {hasDiscount ? (
            <>
              <span className="text-sm font-black text-[#286c00]">ETB {Number(product.discount_price).toFixed(0)}</span>
              <span className="text-[10px] text-gray-400 line-through">ETB {Number(product.price).toFixed(0)}</span>
            </>
          ) : (
            <span className="text-sm font-black text-[#286c00]">ETB {Number(product.price).toFixed(0)}</span>
          )}
        </div>
        {product.stock <= 0 && <span className="text-[9px] text-red-500 font-bold mt-1 block">Out of stock</span>}
      </div>
    </Link>
  );
};

export default function FarmerStorePage() {
  const params = useParams();
  const router = useRouter();
  const farmerId = params?.id as string;

  const [farmer, setFarmer] = useState<any>(null);
  const [layout, setLayout] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmerId) return;
    (async () => {
      try {
        const [farmerRes, layoutRes, productsRes, categoriesRes] = await Promise.all([
          api.getFarmerProfile(farmerId).catch(() => null),
          api.getStoreLayoutByFarmerId(farmerId).catch(() => null),
          api.getProducts({ farmer_id: farmerId, limit: 50 }).catch(() => ({ products: [] })),
          api.getCategories().catch(() => ({ categories: [] }))
        ]);

        if (farmerRes?.user) setFarmer(farmerRes.user);
        if (layoutRes?.layout) setLayout(layoutRes.layout);
        setProducts(productsRes.products || []);
        setCategories(categoriesRes.categories || []);
      } catch (err) {
        console.error("Failed to load farmer store", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [farmerId]);

  const modules: any[] = (() => {
    if (!layout?.modules) return [];
    if (typeof layout.modules === 'string') {
      try { return JSON.parse(layout.modules); } catch { return []; }
    }
    return Array.isArray(layout.modules) ? layout.modules : [];
  })();

  const themeSettings: any = (() => {
    if (!layout?.theme_settings) return {};
    if (typeof layout.theme_settings === 'string') {
      try { return JSON.parse(layout.theme_settings); } catch { return {}; }
    }
    return layout.theme_settings;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#286c00] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 font-medium">Loading store...</span>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-gray-300 text-6xl mb-3 block">storefront</span>
          <p className="text-gray-500 font-medium">Farmer store not found.</p>
          <button onClick={() => router.back()} className="mt-4 text-[#286c00] font-bold text-sm hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  const sortedModules = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#111827] font-sans antialiased" style={{ fontFamily: themeSettings.font || 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-[#e5e7eb]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <Link href="/buyer/dashboard" className="text-xl font-bold text-[#286c00] flex items-center gap-1.5">
                <span className="material-symbols-outlined">eco</span> GreenHarvest
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/buyer/profile" className="text-gray-700 hover:text-[#286c00] transition-colors flex flex-col items-center">
                <span className="material-symbols-outlined">person</span>
                <span className="text-[10px] mt-0.5 font-medium">Account</span>
              </Link>
              <button onClick={() => router.push('/buyer/dashboard')} className="text-gray-700 hover:text-[#286c00] transition-colors flex flex-col items-center relative">
                <span className="material-symbols-outlined">shopping_cart</span>
                <span className="text-[10px] mt-0.5 font-medium">Cart</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Farmer Info Hero */}
      <div className="bg-gradient-to-br from-[#286c00] via-[#3a8f10] to-[#4caf50] text-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-3xl font-black shrink-0">
              {(farmer.name || 'F').charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-black mb-1 flex items-center gap-2 justify-center sm:justify-start">
                {farmer.name || 'Farmer Store'}
                <span className="material-symbols-outlined text-yellow-300 text-xl">verified</span>
              </h1>
              <p className="text-white/80 text-sm">{farmer.bio || 'GreenHarvest Verified Farmer'}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-white/70 justify-center sm:justify-start">
                {farmer.address && (
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>{farmer.address}</span>
                )}
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">inventory_2</span>{products.length} Products</span>
                {farmer.created_at && (
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_month</span>Joined {new Date(farmer.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Render Store Decoration Modules */}
        {sortedModules.length > 0 ? (
          sortedModules.map((module: any) => {
            const content = module.content || {};
            const styles = module.styles || {};

            /* ── Banner Module ── */
            if (module.type === 'banner') {
              return (
                <div key={module.id} className="relative rounded-2xl overflow-hidden shadow-lg" style={{ paddingTop: styles.paddingTop || 48, paddingBottom: styles.paddingBottom || 48 }}>
                  {content.imageUrl && (
                    <img src={content.imageUrl} alt={content.title || 'Banner'} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${(styles.overlayOpacity || 30) / 100})` }} />
                  <div className="relative z-10 px-8 py-12 text-center" style={{ color: styles.textColor || '#ffffff' }}>
                    {content.title && <h2 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">{content.title}</h2>}
                    {content.subtitle && <p className="text-lg opacity-90 mb-4">{content.subtitle}</p>}
                    {content.buttonLink && (
                      <Link href={content.buttonLink} className="inline-block bg-white text-gray-900 font-bold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors text-sm shadow-md">
                        Shop Now
                      </Link>
                    )}
                  </div>
                </div>
              );
            }

            /* ── Categories Module ── */
            if (module.type === 'categories') {
              return (
                <div key={module.id}>
                  {content.title && <h2 className="text-xl font-black text-gray-900 mb-5 tracking-tight">{content.title}</h2>}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {categories.slice(0, 8).map((cat: any) => (
                      <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:shadow-md hover:border-[#286c00]/30 transition-all cursor-pointer group">
                        <div className="w-12 h-12 rounded-full bg-green-50 mx-auto flex items-center justify-center mb-2 group-hover:bg-green-100 transition-colors">
                          <span className="material-symbols-outlined text-[#286c00]">eco</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 line-clamp-1">{cat.name || cat.category_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            /* ── Products Module ── */
            if (module.type === 'products') {
              return (
                <div key={module.id}>
                  {content.title && <h2 className="text-xl font-black text-gray-900 mb-5 tracking-tight">{content.title}</h2>}
                  {products.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {products.slice(0, 12).map((p) => <ProductCard key={p.id} product={p} />)}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400 text-sm">No products listed yet.</div>
                  )}
                </div>
              );
            }

            /* ── Video Module ── */
            if (module.type === 'video') {
              const videoId = content.videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
              return (
                <div key={module.id}>
                  {content.title && <h2 className="text-xl font-black text-gray-900 mb-5 tracking-tight">{content.title}</h2>}
                  {videoId ? (
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={content.title || 'Farm Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : content.videoUrl ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                      <span className="material-symbols-outlined text-gray-300 text-5xl mb-2 block">videocam</span>
                      <a href={content.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[#286c00] font-bold text-sm hover:underline">Watch Video →</a>
                    </div>
                  ) : null}
                </div>
              );
            }

            /* ── Coupon Slider Module ── */
            if (module.type === 'coupon_slider') {
              const coupons = content.coupons || [];
              return (
                <div key={module.id}>
                  {content.title && <h2 className="text-xl font-black text-gray-900 mb-5 tracking-tight">{content.title}</h2>}
                  {coupons.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                      {coupons.map((coupon: any, i: number) => (
                        <div key={i} className="min-w-[260px] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-5 snap-start shrink-0 shadow-md">
                          <p className="text-2xl font-black mb-1">{coupon.code || 'SAVE10'}</p>
                          <p className="text-sm opacity-90">{coupon.description || 'Special discount'}</p>
                          {coupon.discount && <p className="text-xs mt-2 font-bold bg-white/20 inline-block px-2 py-0.5 rounded-full">{coupon.discount}% OFF</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">No coupons available right now.</div>
                  )}
                </div>
              );
            }

            /* ── Flash Sale Module ── */
            if (module.type === 'flash_sale') {
              const saleProducts = products.filter((p) => p.discount_price && Number(p.discount_price) > 0 && Number(p.discount_price) < Number(p.price));
              return (
                <div key={module.id} className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-black text-red-600 flex items-center gap-2">
                        <span className="material-symbols-outlined text-2xl">local_fire_department</span>
                        {content.title || 'Flash Sale'}
                      </h2>
                    </div>
                    {content.endTime && <CountdownTimer endTime={content.endTime} />}
                  </div>
                  {saleProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {saleProducts.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <span className="material-symbols-outlined text-gray-300 text-4xl block mb-2">sell</span>
                      No flash sale items right now. Check back soon!
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })
        ) : (
          /* Fallback: No custom layout — show all products */
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-5">All Products</h2>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">inventory_2</span>
                <p className="font-medium">This farmer hasn&apos;t listed any products yet.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-gray-500">
          <p className="font-medium">🌱 Powered by <Link href="/buyer/dashboard" className="text-[#286c00] font-bold hover:underline">GreenHarvest</Link></p>
          <p className="mt-1">Supporting local farmers, fresh food for everyone.</p>
        </div>
      </footer>
    </div>
  );
}
