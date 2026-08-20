'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CountdownTimer = ({ endTime }: { endTime: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(endTime).getTime();
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

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
    <div className="flex justify-center gap-4 my-6">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Mins', value: timeLeft.minutes },
        { label: 'Secs', value: timeLeft.seconds }
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500 text-white rounded-lg flex items-center justify-center text-2xl font-black shadow-md">
            {item.value.toString().padStart(2, '0')}
          </div>
          <span className="text-xs font-bold text-gray-500 mt-2 uppercase tracking-wider">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function StoreDecorationPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dashboard info for the sidebar
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Store layout state
  const [layout, setLayout] = useState<{
    theme_settings: any;
    modules: any[];
    is_published: boolean;
  }>({
    theme_settings: { theme: 'Agri-Vibrant', font: 'Inter', textColor: '#000000' },
    modules: [],
    is_published: false
  });
  
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const carouselFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, userRes, notifRes, layoutRes, productsRes, categoriesRes] = await Promise.all([
        api.getFarmerDashboard().catch(() => ({})),
        api.getUserProfile().catch(() => ({ user: null })),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getStoreLayout().catch(() => ({ layout: null })),
        api.getProducts().catch(() => ({ products: [] })),
        api.getCategories().catch(() => ({ categories: [] }))
      ]);
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
      setProducts(productsRes.products || []);
      setCategories(categoriesRes.categories || []);
      
      if (layoutRes.layout) {
        setLayout({
          theme_settings: typeof layoutRes.layout.theme_settings === 'string' ? JSON.parse(layoutRes.layout.theme_settings) : (layoutRes.layout.theme_settings || {}),
          modules: typeof layoutRes.layout.modules === 'string' ? JSON.parse(layoutRes.layout.modules) : (layoutRes.layout.modules || []),
          is_published: layoutRes.layout.is_published || false
        });
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleSave = async (publish: boolean = false) => {
    try {
      setSaving(true);
      const dataToSave = {
        ...layout,
        is_published: publish ? true : layout.is_published
      };
      await api.updateStoreLayout(dataToSave);
      setLayout(dataToSave);
      showSuccess(publish ? 'Store published successfully!' : 'Draft saved successfully!');
    } catch (err) {
      console.error("Failed to save layout", err);
      showError('Failed to save layout.');
    } finally {
      setSaving(false);
    }
  };

  const addModule = (type: string) => {
    const newModule = {
      id: `${type}-${Date.now()}`,
      type,
      content: getInitialContentForType(type),
      styles: getInitialStylesForType(type),
      order: layout.modules.length
    };
    setLayout({ ...layout, modules: [...layout.modules, newModule] });
    setSelectedModuleId(newModule.id);
  };

  const removeModule = (id: string) => {
    setLayout({
      ...layout,
      modules: layout.modules.filter(m => m.id !== id)
    });
    if (selectedModuleId === id) setSelectedModuleId(null);
  };

  const moveModuleUp = (id: string) => {
    const index = layout.modules.findIndex(m => m.id === id);
    if (index > 0) {
      const newModules = [...layout.modules];
      [newModules[index - 1], newModules[index]] = [newModules[index], newModules[index - 1]];
      setLayout({ ...layout, modules: newModules });
    }
  };

  const moveModuleDown = (id: string) => {
    const index = layout.modules.findIndex(m => m.id === id);
    if (index < layout.modules.length - 1) {
      const newModules = [...layout.modules];
      [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];
      setLayout({ ...layout, modules: newModules });
    }
  };

  const updateSelectedModule = (field: 'content' | 'styles', key: string, value: any) => {
    setLayout(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id === selectedModuleId) {
          return {
            ...m,
            [field]: { ...m[field], [key]: value }
          };
        }
        return m;
      })
    }));
  };

  const updateGlobalTheme = (key: string, value: any) => {
    setLayout(prev => ({
      ...prev,
      theme_settings: { ...prev.theme_settings, [key]: value }
    }));
  };

  const handleImageUpload = async (file: File, field: string, isArray = false) => {
    setUploadError('');
    setIsUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setLayout(prev => ({
        ...prev,
        modules: prev.modules.map(m => {
          if (m.id === selectedModuleId) {
            if (isArray) {
              const current = m.content?.[field] || [];
              return {
                ...m,
                content: { ...m.content, [field]: [...current, url] }
              };
            } else {
              return {
                ...m,
                content: { ...m.content, [field]: url }
              };
            }
          }
          return m;
        })
      }));
    } catch {
      setUploadError('Image upload failed. Please try again.');
      showError('Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, 'imageUrl');
    e.target.value = '';
  };

  const handleCarouselFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, 'images', true);
    e.target.value = '';
  };

  const removeCarouselImage = (index: number) => {
    const current = selectedModule?.content?.images || [];
    updateSelectedModule('content', 'images', current.filter((_: string, i: number) => i !== index));
  };

  const getInitialContentForType = (type: string) => {
    switch (type) {
      case 'banner': return { title: '', subtitle: '', buttonLink: '', imageUrl: '' };
      case 'text': return { title: '', text: '' };
      case 'categories': return { title: '' };
      case 'products': return { title: '' };
      case 'carousel': return { title: '', images: [] };
      case 'video': return { title: '', videoUrl: '' };
      case 'coupon_slider': return { title: '', coupons: [] };
      case 'flash_sale': return { title: '', endTime: new Date(Date.now() + 86400000).toISOString() };
      default: return {};
    }
  };

  const getInitialStylesForType = (type: string) => {
    return { paddingTop: 40, paddingBottom: 40, overlayOpacity: 30, textColor: '#ffffff' };
  };

  const selectedModule = layout.modules.find(m => m.id === selectedModuleId);
  const pendingShipments = dashboardData?.pending_shipments?.length || 0;
  const unreadMessages = notifications.filter(n => !n.is_read).length;

  return (
    <>{/* REST OF SCREEN */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        
        {/* TOP BUILDER HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-black text-[#2d9a33] tracking-tight flex items-center gap-2" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              <span className="material-symbols-outlined">yard</span> AgriWorkbench
            </h1>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 ml-4">
              <span className="text-[#2d9a33] border-b-2 border-[#2d9a33] py-5">Store Decoration</span>
              <Link href="/farmer/products" className="hover:text-gray-900 py-5">Products</Link>
              <Link href="/farmer/orders" className="hover:text-gray-900 py-5">Orders</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={() => setIsPreviewOpen(true)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
              Preview
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 bg-[#2d9a33] hover:bg-[#25822a] text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
              {saving ? 'Publishing...' : 'Publish'}
            </button>
            
            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors relative">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 bg-red-500 w-2 h-2 rounded-full"></span>}
            </button>
            
            <div className="w-8 h-8 rounded-full bg-green-100 overflow-hidden ml-2 border border-gray-200">
              {user?.image_url ? (
                <img src={user.image_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#2d9a33] font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BUILDER WORKSPACE (3 PANES) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* PANE 1: MODULES SIDEBAR */}
          <div className="w-[260px] bg-[#f9fafb] border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-10 overflow-y-auto custom-scrollbar">
            <div className="p-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Modules</h2>
              
              <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Basic Blocks</h3>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button onClick={() => addModule('banner')} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">image</span>
                  <span className="text-[11px] font-bold">Banner</span>
                </button>
                <button onClick={() => addModule('carousel')} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">view_carousel</span>
                  <span className="text-[11px] font-bold">Carousel</span>
                </button>
                <button onClick={() => addModule('products')} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">grid_view</span>
                  <span className="text-[11px] font-bold">Product Grid</span>
                </button>
                <button onClick={() => addModule('video')} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">videocam</span>
                  <span className="text-[11px] font-bold">Video</span>
                </button>
                <button onClick={() => addModule('text')} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">title</span>
                  <span className="text-[11px] font-bold">Text Block</span>
                </button>
                <button onClick={() => addModule('categories')} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">category</span>
                  <span className="text-[11px] font-bold">Categories</span>
                </button>
              </div>

              <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Marketing</h3>
              <div className="flex flex-col gap-2 mb-8">
                <button onClick={() => addModule('coupon_slider')} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm text-left">
                  <span className="material-symbols-outlined text-[#c09930]">local_activity</span>
                  <span className="text-xs font-bold">Coupon Slider</span>
                </button>
                <button onClick={() => addModule('flash_sale')} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:border-[#2d9a33] hover:text-[#2d9a33] transition-colors text-gray-600 shadow-sm text-left">
                  <span className="material-symbols-outlined text-orange-500">timer</span>
                  <span className="text-xs font-bold">Flash Sale</span>
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Global Theme</h3>
                <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-xs font-bold shadow-sm mb-6">
                  <button onClick={() => updateGlobalTheme('theme', 'Agri-Vibrant')} className={`flex-1 py-2 text-center transition-colors ${layout.theme_settings.theme === 'Agri-Vibrant' ? 'bg-[#2d9a33] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Agri-Vibrant</button>
                  <button onClick={() => updateGlobalTheme('theme', 'Classic')} className={`flex-1 py-2 text-center transition-colors border-l border-gray-200 ${layout.theme_settings.theme === 'Classic' ? 'bg-[#2d9a33] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Classic</button>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase">Device View</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setDeviceView('mobile')} className={`p-1.5 rounded-md transition-colors ${deviceView === 'mobile' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                      <span className="material-symbols-outlined text-[18px]">smartphone</span>
                    </button>
                    <button onClick={() => setDeviceView('desktop')} className={`p-1.5 rounded-md transition-colors ${deviceView === 'desktop' ? 'bg-[#2d9a33] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                      <span className="material-symbols-outlined text-[18px]">desktop_windows</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PANE 2: CANVAS */}
          <div className="flex-1 bg-[#e5e7eb] relative overflow-y-auto flex justify-center p-8 custom-scrollbar relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            <div 
              className={`bg-white shadow-2xl transition-all duration-300 min-h-[800px] border border-gray-200 flex flex-col`}
              style={{ width: deviceView === 'desktop' ? '100%' : '375px', maxWidth: deviceView === 'desktop' ? '1000px' : '375px', fontFamily: layout.theme_settings.font || 'Inter' }}
            >
              {layout.modules.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                  <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">drag_indicator</span>
                  <h2 className="text-xl font-bold text-gray-700 mb-2">Your Store is Empty</h2>
                  <p className="text-sm max-w-sm">Click a module from the left panel to add it to your store homepage.</p>
                </div>
              ) : (
                layout.modules.map((module) => {
                  const isSelected = selectedModuleId === module.id;
                  return (
                    <div 
                      key={module.id} 
                      onClick={() => setSelectedModuleId(module.id)}
                      className={`relative cursor-pointer transition-all border-2 ${isSelected ? 'border-[#2d9a33] z-10' : 'border-transparent hover:border-gray-300 z-0'}`}
                      style={{ 
                        paddingTop: `${module.styles?.paddingTop || 0}px`, 
                        paddingBottom: `${module.styles?.paddingBottom || 0}px`,
                      }}
                    >
                      {/* Hover/Select Overlay Controls */}
                      {isSelected && (
                        <div className="absolute top-0 right-0 bg-[#2d9a33] text-white flex rounded-bl-lg shadow-md z-20">
                          <button onClick={(e) => { e.stopPropagation(); moveModuleUp(module.id); }} className="p-1.5 hover:bg-green-700 transition-colors" title="Move Up"><span className="material-symbols-outlined text-[16px]">arrow_upward</span></button>
                          <button onClick={(e) => { e.stopPropagation(); moveModuleDown(module.id); }} className="p-1.5 hover:bg-green-700 transition-colors border-l border-green-700" title="Move Down"><span className="material-symbols-outlined text-[16px]">arrow_downward</span></button>
                          <button onClick={(e) => { e.stopPropagation(); removeModule(module.id); }} className="p-1.5 bg-red-500 hover:bg-red-600 transition-colors border-l border-green-700 rounded-bl-lg" title="Delete"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
                      )}

                      {/* RENDER BANNER */}
                      {module.type === 'banner' && (
                        <div className="relative w-full aspect-[21/9] bg-gray-100 overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
                          {module.content.imageUrl ? (
                            <img src={module.content.imageUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 w-full h-full bg-gray-200 flex flex-col items-center justify-center text-gray-400">
                              <span className="material-symbols-outlined text-[48px] mb-2">image</span>
                              <p className="text-sm font-bold">No Banner Image</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black" style={{ opacity: (module.styles.overlayOpacity || 30) / 100 }}></div>
                          <div className="relative z-10 text-center p-8 max-w-3xl">
                            <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight" style={{ color: module.styles.textColor || '#fff', fontFamily: 'Impact, Arial Black, sans-serif' }}>
                              {module.content.title?.toUpperCase() || 'BANNER TITLE'}
                            </h2>
                            <p className="text-lg md:text-xl font-medium" style={{ color: module.styles.textColor || '#fff' }}>
                              {module.content.subtitle || 'Banner subtitle text'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* RENDER CATEGORIES */}
                      {module.type === 'categories' && (
                        <div className="px-8 w-full">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold tracking-widest text-gray-900">{module.content.title?.toUpperCase() || 'SHOP BY CATEGORY'}</h3>
                            <a href="#" className="text-sm font-bold text-[#2d9a33] hover:underline">Edit List</a>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            {categories.slice(0, 8).map((cat, i) => (
                              <div key={i} className="flex flex-col items-center group">
                                <div className="w-32 h-32 rounded-full overflow-hidden mb-3 border-4 border-white shadow-lg group-hover:border-[#2d9a33] transition-colors bg-gray-100 flex items-center justify-center">
                                  {cat.image_url ? (
                                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  ) : (
                                    <span className="material-symbols-outlined text-[48px] text-gray-400">category</span>
                                  )}
                                </div>
                                <span className="text-xs font-bold text-gray-800 uppercase">{cat.name}</span>
                              </div>
                            ))}
                            {categories.length === 0 && (
                              <div className="col-span-full py-8 text-gray-400 text-sm">No categories found.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* RENDER PRODUCTS */}
                      {module.type === 'products' && (
                        <div className="px-8 w-full">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold tracking-widest text-gray-900">{module.content.title?.toUpperCase() || 'TOP SELLING PRODUCTS'}</h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {products.slice(0, 6).map((item) => (
                              <div key={item.id} className="bg-white border border-gray-200 p-4 transition-shadow hover:shadow-lg rounded-lg">
                                <div className="aspect-square bg-gray-100 mb-4 overflow-hidden relative rounded-md">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-[48px] text-gray-300">image</span>
                                    </div>
                                  )}
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{item.name}</h4>
                                <p className="text-[#2d9a33] font-bold">${item.price}</p>
                              </div>
                            ))}
                            {products.length === 0 && (
                              <div className="col-span-full py-8 text-gray-400 text-sm text-center">No products found in your inventory.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* RENDER TEXT */}
                      {module.type === 'text' && (
                        <div className="px-8 max-w-3xl mx-auto text-center">
                          <h2 className="text-2xl font-bold text-gray-900 mb-4">{module.content.title}</h2>
                          <p className="text-gray-600 leading-relaxed">{module.content.text}</p>
                        </div>
                      )}

                      {module.type === 'video' && (
                        <div className="px-8 w-full">
                          <h3 className="text-sm font-bold tracking-widest text-gray-900 mb-4 text-center">{module.content.title?.toUpperCase() || 'FARM TOUR'}</h3>
                          <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-md">
                            {module.content.videoUrl ? (
                              module.content.videoUrl.includes('youtube.com') || module.content.videoUrl.includes('youtu.be') ? (
                                <iframe 
                                  className="w-full h-full" 
                                  src={module.content.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                                  title="Video player" 
                                  frameBorder="0" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                  allowFullScreen 
                                />
                              ) : (
                                <video className="w-full h-full object-cover" controls src={module.content.videoUrl} />
                              )
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined text-[48px] mb-2">play_circle</span>
                                <p className="text-sm font-bold">No Video URL Provided</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {module.type === 'coupon_slider' && (
                        <div className="px-8 w-full">
                          <h3 className="text-sm font-bold tracking-widest text-gray-900 mb-4 text-center">{module.content.title?.toUpperCase() || 'SPECIAL OFFERS'}</h3>
                          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                            {(module.content.coupons || []).map((coupon: any, i: number) => (
                              <div key={i} className="flex-shrink-0 w-64 bg-gradient-to-r from-[#2d9a33] to-[#25822a] rounded-xl p-4 text-white shadow-lg relative overflow-hidden snap-center">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                                <div className="relative z-10">
                                  <span className="text-3xl font-black">{coupon.discount}</span>
                                  <span className="text-sm ml-1 opacity-90">OFF</span>
                                  <p className="text-sm mt-1 mb-3 opacity-90 leading-tight h-10">{coupon.description}</p>
                                  <div className="bg-white/20 border border-white/40 rounded px-3 py-1.5 flex justify-between items-center backdrop-blur-sm">
                                    <span className="font-mono text-sm tracking-widest font-bold">{coupon.code}</span>
                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(!module.content.coupons || module.content.coupons.length === 0) && (
                              <div className="w-full p-8 text-center border border-dashed border-gray-300 rounded-lg text-gray-400">
                                No coupons added yet.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {module.type === 'flash_sale' && (
                        <div className="px-8 w-full bg-red-50/50 py-8 border-y border-red-100">
                          <div className="text-center mb-6">
                            <h3 className="text-2xl font-black text-red-600 mb-2 flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[28px]">flash_on</span>
                              {module.content.title?.toUpperCase() || 'FLASH SALE'}
                            </h3>
                            <CountdownTimer endTime={module.content.endTime} />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {products.slice(0, 4).map((item) => (
                              <div key={item.id} className="bg-white border border-red-200 p-3 rounded-lg relative">
                                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 shadow-sm border-2 border-white">
                                  SALE
                                </div>
                                <div className="aspect-square bg-gray-100 mb-3 overflow-hidden rounded-md relative">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-[32px] text-gray-300">image</span>
                                    </div>
                                  )}
                                </div>
                                <h4 className="font-bold text-gray-900 text-xs mb-1 line-clamp-1">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                  <p className="text-red-600 font-black text-sm">${(item.price * 0.8).toFixed(2)}</p>
                                  <p className="text-gray-400 line-through text-[10px]">${item.price}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* OTHER MODULES MOCK RENDERERS */}
                      {['carousel'].includes(module.type) && (
                        <div className="px-8 w-full text-center">
                          <h3 className="text-sm font-bold tracking-widest text-gray-900 mb-4">{module.content.title?.toUpperCase() || module.type.toUpperCase()}</h3>
                          {module.content.images?.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {module.content.images.map((img: string, i: number) => (
                                <img key={i} src={img} alt={`Slide ${i + 1}`} className="h-40 w-64 object-cover rounded-lg flex-shrink-0" />
                              ))}
                            </div>
                          ) : (
                            <div className="p-12 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-3">
                              <span className="material-symbols-outlined text-[32px] text-gray-400">
                                view_carousel
                              </span>
                              <p className="text-gray-500 font-bold uppercase">CAROUSEL CONTENT PLACEHOLDER</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* FALLBACK */}
                      {!['banner', 'categories', 'products', 'text', 'carousel', 'video', 'coupon_slider', 'flash_sale'].includes(module.type) && (
                        <div className="p-8 bg-gray-50 text-center border border-dashed border-gray-300 m-4 rounded-lg">
                          <p className="text-gray-500 font-bold uppercase">{module.type} MODULE PREVIEW</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PANE 3: PROPERTIES SIDEBAR */}
          <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col h-full flex-shrink-0 z-20">
            {selectedModule ? (
              <div className="flex flex-col h-full">
                <div className="h-14 border-b border-gray-100 flex items-center justify-between px-5 bg-gray-50 flex-shrink-0">
                  <h2 className="font-bold text-gray-900 text-sm capitalize">{selectedModule.type} Module</h2>
                  <button onClick={() => setSelectedModuleId(null)} className="text-gray-400 hover:text-gray-600">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                  
                  {/* Module Content section */}
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-wider">Module Content</h3>
                    
                    {/* Banner specific */}
                    {selectedModule.type === 'banner' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2">Banner Image</label>
                          <input
                            ref={bannerFileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleBannerFileChange}
                          />
                          <div
                            onClick={() => !isUploading && bannerFileRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex flex-col items-center justify-center text-gray-400 hover:border-[#2d9a33] hover:text-[#2d9a33] hover:bg-green-50 transition-colors cursor-pointer bg-gray-50 relative min-h-[120px]"
                          >
                            {selectedModule.content.imageUrl ? (
                              <img src={selectedModule.content.imageUrl} alt="Banner preview" className="w-full h-32 object-cover" />
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[24px] mb-2 mt-4">upload_file</span>
                                <span className="text-xs font-medium mb-4">Click to upload image</span>
                              </>
                            )}
                            {isUploading && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                              </div>
                            )}
                          </div>
                          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                          <input 
                            type="text" 
                            className="w-full mt-2 text-xs border border-gray-200 p-2 rounded focus:outline-none focus:border-[#2d9a33]" 
                            placeholder="Or paste image URL"
                            value={selectedModule.content.imageUrl || ''}
                            onChange={(e) => updateSelectedModule('content', 'imageUrl', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Main Title</label>
                          <input 
                            type="text" 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33] focus:border-[#2d9a33]"
                            value={selectedModule.content.title || ''}
                            onChange={(e) => updateSelectedModule('content', 'title', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Subtitle Text</label>
                          <textarea 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md h-20 focus:outline-none focus:ring-1 focus:ring-[#2d9a33] focus:border-[#2d9a33]"
                            value={selectedModule.content.subtitle || ''}
                            onChange={(e) => updateSelectedModule('content', 'subtitle', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Button Link</label>
                          <input 
                            type="text" 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33] focus:border-[#2d9a33]"
                            value={selectedModule.content.buttonLink || ''}
                            onChange={(e) => updateSelectedModule('content', 'buttonLink', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Text specific */}
                    {selectedModule.type === 'text' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                          <input 
                            type="text" 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33]"
                            value={selectedModule.content.title || ''}
                            onChange={(e) => updateSelectedModule('content', 'title', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Body Text</label>
                          <textarea 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md h-32 focus:outline-none focus:ring-1 focus:ring-[#2d9a33]"
                            value={selectedModule.content.text || ''}
                            onChange={(e) => updateSelectedModule('content', 'text', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Carousel specific */}
                    {selectedModule.type === 'carousel' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Section Title</label>
                          <input 
                            type="text" 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33]"
                            value={selectedModule.content.title || ''}
                            onChange={(e) => updateSelectedModule('content', 'title', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2">Carousel Images</label>
                          <input
                            ref={carouselFileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleCarouselFileChange}
                          />
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {(selectedModule.content.images || []).map((img: string, i: number) => (
                              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
                                <img src={img} alt={`Slide ${i + 1}`} className="w-full h-20 object-cover" />
                                <button
                                  onClick={() => removeCarouselImage(i)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => !isUploading && carouselFileRef.current?.click()}
                            disabled={isUploading}
                            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-center gap-2 text-gray-400 hover:border-[#2d9a33] hover:text-[#2d9a33] hover:bg-green-50 transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {isUploading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2d9a33]" />
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                                Add Image
                              </>
                            )}
                          </button>
                          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                        </div>
                      </div>
                    )}

                    {/* Specific properties for video, coupon_slider, flash_sale */}
                    {selectedModule.type === 'video' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Video URL (YouTube, Vimeo, MP4)</label>
                          <input 
                            type="text" 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33]"
                            value={selectedModule.content.videoUrl || ''}
                            onChange={(e) => updateSelectedModule('content', 'videoUrl', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>
                      </div>
                    )}

                    {selectedModule.type === 'coupon_slider' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2">Coupons</label>
                          <div className="space-y-3 mb-3">
                            {(selectedModule.content.coupons || []).map((coupon: any, i: number) => (
                              <div key={i} className="p-3 border border-gray-200 rounded-md bg-gray-50 relative">
                                <button 
                                  onClick={() => {
                                    const newCoupons = [...(selectedModule.content.coupons || [])];
                                    newCoupons.splice(i, 1);
                                    updateSelectedModule('content', 'coupons', newCoupons);
                                  }}
                                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                                <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                                  <div>
                                    <label className="block text-[10px] text-gray-500 font-bold mb-1">Code</label>
                                    <input type="text" className="w-full text-xs p-1.5 border border-gray-300 rounded" value={coupon.code} onChange={(e) => {
                                      const newCoupons = [...(selectedModule.content.coupons || [])];
                                      newCoupons[i].code = e.target.value;
                                      updateSelectedModule('content', 'coupons', newCoupons);
                                    }} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 font-bold mb-1">Discount</label>
                                    <input type="text" className="w-full text-xs p-1.5 border border-gray-300 rounded" placeholder="e.g. 10%" value={coupon.discount} onChange={(e) => {
                                      const newCoupons = [...(selectedModule.content.coupons || [])];
                                      newCoupons[i].discount = e.target.value;
                                      updateSelectedModule('content', 'coupons', newCoupons);
                                    }} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-500 font-bold mb-1">Description</label>
                                  <input type="text" className="w-full text-xs p-1.5 border border-gray-300 rounded" value={coupon.description} onChange={(e) => {
                                    const newCoupons = [...(selectedModule.content.coupons || [])];
                                    newCoupons[i].description = e.target.value;
                                    updateSelectedModule('content', 'coupons', newCoupons);
                                  }} />
                                </div>
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={() => {
                              const newCoupons = [...(selectedModule.content.coupons || []), { code: '', discount: '', description: '' }];
                              updateSelectedModule('content', 'coupons', newCoupons);
                            }}
                            className="w-full py-2 border border-dashed border-[#2d9a33] text-[#2d9a33] rounded-md text-xs font-bold hover:bg-green-50 transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span> Add Coupon
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedModule.type === 'flash_sale' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">End Time</label>
                          <input 
                            type="datetime-local" 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33]"
                            value={selectedModule.content.endTime ? new Date(new Date(selectedModule.content.endTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                            onChange={(e) => updateSelectedModule('content', 'endTime', new Date(e.target.value).toISOString())}
                          />
                        </div>
                      </div>
                    )}

                    {/* Generic Title for all these modules */}
                    {['categories', 'products', 'video', 'coupon_slider', 'flash_sale', 'carousel'].includes(selectedModule.type) && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Section Title</label>
                          <input 
                            type="text" 
                            className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33]"
                            value={selectedModule.content.title || ''}
                            onChange={(e) => updateSelectedModule('content', 'title', e.target.value)}
                          />
                        </div>
                        {['categories', 'products'].includes(selectedModule.type) && (
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                            <p className="text-xs text-blue-700 flex items-start gap-2">
                              <span className="material-symbols-outlined text-[16px]">info</span>
                              This module automatically displays data from your inventory.
                            </p>
                          </div>
                        )}
                        {['flash_sale'].includes(selectedModule.type) && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                            <p className="text-xs text-red-700 flex items-start gap-2">
                              <span className="material-symbols-outlined text-[16px]">info</span>
                              Flash Sale automatically features your first 4 products with a 20% discount visually applied.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-100" />

                  {/* Visual Styles */}
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-wider">Visual Styles</h3>
                    <div className="space-y-5">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-700 mb-1">Padding Top</label>
                          <input 
                            type="number" 
                            className="w-full text-sm border border-gray-300 p-2 rounded-md focus:outline-none"
                            value={selectedModule.styles.paddingTop || 0}
                            onChange={(e) => updateSelectedModule('styles', 'paddingTop', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-700 mb-1">Padding Bottom</label>
                          <input 
                            type="number" 
                            className="w-full text-sm border border-gray-300 p-2 rounded-md focus:outline-none"
                            value={selectedModule.styles.paddingBottom || 0}
                            onChange={(e) => updateSelectedModule('styles', 'paddingBottom', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {selectedModule.type === 'banner' && (
                        <>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-bold text-gray-700">Overlay Opacity</label>
                            </div>
                            <input 
                              type="range" 
                              min="0" max="100" 
                              className="w-full accent-[#2d9a33]"
                              value={selectedModule.styles.overlayOpacity || 0}
                              onChange={(e) => updateSelectedModule('styles', 'overlayOpacity', parseInt(e.target.value))}
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                              <span>0%</span>
                              <span>{selectedModule.styles.overlayOpacity || 0}%</span>
                              <span>100%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">Text Color</label>
                            <div className="flex gap-2">
                              {['#ffffff', '#000000', '#2d9a33', '#c09930'].map(color => (
                                <button 
                                  key={color} 
                                  onClick={() => updateSelectedModule('styles', 'textColor', color)}
                                  className={`w-6 h-6 rounded-full border-2 ${selectedModule.styles.textColor === color ? 'border-blue-500 scale-110' : 'border-gray-200'}`} 
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                              <button className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 bg-white">
                                <span className="material-symbols-outlined text-[14px]">add</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Global Font Override</label>
                        <select 
                          className="w-full text-sm border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2d9a33] bg-white"
                          value={layout.theme_settings.font || 'Inter'}
                          onChange={(e) => updateGlobalTheme('font', e.target.value)}
                        >
                          <option value="Inter">Inter (Default)</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Module Actions */}
                <div className="p-4 border-t border-gray-200 bg-white flex gap-3">
                  <button onClick={() => setSelectedModuleId(null)} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
                    Discard
                  </button>
                  <button onClick={() => handleSave(false)} className="flex-1 px-4 py-2 bg-[#2d9a33] hover:bg-[#25822a] text-white rounded-lg text-sm font-bold transition-colors">
                    Save Module
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center bg-gray-50/50">
                <span className="material-symbols-outlined text-[48px] mb-3 opacity-30">settings</span>
                <p className="text-sm font-medium">Select a module from the canvas to edit its properties.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="h-14 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
              <h2 className="font-bold text-gray-900">Live Preview: {layout.theme_settings.theme}</h2>
              <button onClick={() => setIsPreviewOpen(false)} className="text-gray-500 hover:text-gray-900">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#e5e7eb] flex justify-center p-8 custom-scrollbar">
              <div 
                className="bg-white shadow-2xl min-h-full flex flex-col"
                style={{ width: deviceView === 'desktop' ? '100%' : '375px', maxWidth: deviceView === 'desktop' ? '1000px' : '375px', fontFamily: layout.theme_settings.font || 'Inter' }}
              >
                {layout.modules.map((module) => (
                  <div key={module.id} style={{ paddingTop: `${module.styles?.paddingTop || 0}px`, paddingBottom: `${module.styles?.paddingBottom || 0}px` }}>
                    {module.type === 'banner' && (
                      <div className="relative w-full aspect-[21/9] bg-gray-100 overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
                        {module.content.imageUrl ? (
                          <img src={module.content.imageUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-gray-200 flex flex-col items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-[48px] mb-2">image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black" style={{ opacity: (module.styles.overlayOpacity || 30) / 100 }}></div>
                        <div className="relative z-10 text-center p-8 max-w-3xl">
                          <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight" style={{ color: module.styles.textColor || '#fff', fontFamily: 'Impact, Arial Black, sans-serif' }}>
                            {module.content.title?.toUpperCase() || 'BANNER TITLE'}
                          </h2>
                          <p className="text-lg md:text-xl font-medium" style={{ color: module.styles.textColor || '#fff' }}>
                            {module.content.subtitle || 'Banner subtitle text'}
                          </p>
                        </div>
                      </div>
                    )}
                    {module.type === 'text' && (
                      <div className="px-8 max-w-3xl mx-auto text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{module.content.title}</h2>
                        <p className="text-gray-600 leading-relaxed">{module.content.text}</p>
                      </div>
                    )}
                    {/* Advanced renderers for preview */}
                    {module.type === 'video' && (
                      <div className="px-8 w-full">
                        <h3 className="text-sm font-bold tracking-widest text-gray-900 mb-4 text-center">{module.content.title?.toUpperCase() || 'FARM TOUR'}</h3>
                        <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-md">
                          {module.content.videoUrl ? (
                            module.content.videoUrl.includes('youtube.com') || module.content.videoUrl.includes('youtu.be') ? (
                              <iframe 
                                className="w-full h-full" 
                                src={module.content.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                                title="Video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen 
                              />
                            ) : (
                              <video className="w-full h-full object-cover" controls src={module.content.videoUrl} />
                            )
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                              <span className="material-symbols-outlined text-[48px] mb-2">play_circle</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {module.type === 'coupon_slider' && (
                      <div className="px-8 w-full">
                        <h3 className="text-sm font-bold tracking-widest text-gray-900 mb-4 text-center">{module.content.title?.toUpperCase() || 'SPECIAL OFFERS'}</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                          {(module.content.coupons || []).map((coupon: any, i: number) => (
                            <div key={i} className="flex-shrink-0 w-64 bg-gradient-to-r from-[#2d9a33] to-[#25822a] rounded-xl p-4 text-white shadow-lg relative overflow-hidden snap-center">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                              <div className="relative z-10">
                                <span className="text-3xl font-black">{coupon.discount}</span>
                                <span className="text-sm ml-1 opacity-90">OFF</span>
                                <p className="text-sm mt-1 mb-3 opacity-90 leading-tight h-10">{coupon.description}</p>
                                <div className="bg-white/20 border border-white/40 rounded px-3 py-1.5 flex justify-between items-center backdrop-blur-sm">
                                  <span className="font-mono text-sm tracking-widest font-bold">{coupon.code}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {module.type === 'flash_sale' && (
                      <div className="px-8 w-full bg-red-50/50 py-8 border-y border-red-100">
                        <div className="text-center mb-6">
                          <h3 className="text-2xl font-black text-red-600 mb-2 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[28px]">flash_on</span>
                            {module.content.title?.toUpperCase() || 'FLASH SALE'}
                          </h3>
                          <CountdownTimer endTime={module.content.endTime} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {products.slice(0, 4).map((item) => (
                            <div key={item.id} className="bg-white border border-red-200 p-3 rounded-lg relative">
                              <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 shadow-sm border-2 border-white">SALE</div>
                              <div className="aspect-square bg-gray-100 mb-3 overflow-hidden rounded-md relative">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[32px] text-gray-300">image</span>
                                  </div>
                                )}
                              </div>
                              <h4 className="font-bold text-gray-900 text-xs mb-1 line-clamp-1">{item.name}</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-red-600 font-black text-sm">${(item.price * 0.8).toFixed(2)}</p>
                                <p className="text-gray-400 line-through text-[10px]">${item.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simplified renderers for other preview modules */}
                    {['categories', 'products', 'carousel'].includes(module.type) && (
                      <div className="px-8 w-full text-center">
                        <h3 className="text-sm font-bold tracking-widest text-gray-900 mb-4">{module.content.title?.toUpperCase() || module.type.toUpperCase()}</h3>
                        <div className="p-12 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                          <p className="text-gray-500 font-bold uppercase">{module.type} CONTENT PLACEHOLDER</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
   </>
  );
}
