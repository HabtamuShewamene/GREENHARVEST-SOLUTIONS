'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function StoreDecorationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dashboard info for the sidebar
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, userRes, notifRes, layoutRes] = await Promise.all([
        api.getFarmerDashboard().catch(() => ({})),
        api.getUserProfile().catch(() => ({ user: null })),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getStoreLayout().catch(() => ({ layout: null }))
      ]);
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
      
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
      alert(publish ? "Store Published Successfully!" : "Draft Saved Successfully!");
    } catch (err) {
      console.error("Failed to save layout", err);
      alert("Failed to save layout.");
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
    setLayout({
      ...layout,
      modules: layout.modules.map(m => {
        if (m.id === selectedModuleId) {
          return {
            ...m,
            [field]: { ...m[field], [key]: value }
          };
        }
        return m;
      })
    });
  };

  const updateGlobalTheme = (key: string, value: any) => {
    setLayout({
      ...layout,
      theme_settings: { ...layout.theme_settings, [key]: value }
    });
  };

  const getInitialContentForType = (type: string) => {
    switch (type) {
      case 'banner': return { title: 'New Banner', subtitle: 'Subtitle goes here', buttonLink: '#', imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80' };
      case 'text': return { title: 'Heading', text: 'Some informative text about your farm.' };
      case 'categories': return { title: 'SHOP BY CATEGORY' };
      case 'products': return { title: 'TOP SELLING PRODUCTS' };
      case 'carousel': return { title: 'Featured Collection', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80'] };
      case 'video': return { title: 'Farm Tour', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' };
      case 'coupon_slider': return { title: 'Special Offers' };
      case 'flash_sale': return { title: 'Flash Sale - Ends Soon!' };
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
                          <img src={module.content.imageUrl || 'https://via.placeholder.com/1200x500'} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
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
                            {['Vegetables', 'Pantry', 'Fruits', 'Grains'].map((cat, i) => (
                              <div key={i} className="flex flex-col items-center group">
                                <div className="w-32 h-32 rounded-full overflow-hidden mb-3 border-4 border-white shadow-lg group-hover:border-[#2d9a33] transition-colors">
                                  <img src={`https://source.unsplash.com/random/200x200/?${cat.toLowerCase()},farm`} alt={cat} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <span className="text-xs font-bold text-gray-800 uppercase">{cat}</span>
                              </div>
                            ))}
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
                            {[1, 2, 3].map((item) => (
                              <div key={item} className="bg-white border border-gray-200 p-4 transition-shadow hover:shadow-lg">
                                <div className="aspect-square bg-gray-100 mb-4 overflow-hidden relative">
                                  <img src={`https://source.unsplash.com/random/400x400/?vegetable,fresh,${item}`} alt="Product" className="w-full h-full object-cover" />
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1">Fresh Farm Product</h4>
                                <p className="text-[#2d9a33] font-bold">$12.99</p>
                              </div>
                            ))}
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

                      {/* OTHER MODULES MOCK RENDERERS */}
                      {['carousel', 'video', 'coupon_slider', 'flash_sale'].includes(module.type) && (
                        <div className="px-8 w-full text-center">
                          <h3 className="text-sm font-bold tracking-widest text-gray-900 mb-4">{module.content.title?.toUpperCase() || module.type.toUpperCase()}</h3>
                          <div className="p-12 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-[32px] text-gray-400">
                              {module.type === 'video' ? 'play_circle' : module.type === 'carousel' ? 'view_carousel' : 'local_activity'}
                            </span>
                            <p className="text-gray-500 font-bold uppercase">{module.type.replace('_', ' ')} CONTENT PLACEHOLDER</p>
                          </div>
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
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-[#2d9a33] hover:text-[#2d9a33] hover:bg-green-50 transition-colors cursor-pointer bg-gray-50">
                            <span className="material-symbols-outlined text-[24px] mb-2">upload_file</span>
                            <span className="text-xs font-medium">Click to replace image</span>
                          </div>
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

                    {/* Generic Title for other modules */}
                    {['categories', 'products', 'carousel', 'video', 'coupon_slider', 'flash_sale'].includes(selectedModule.type) && (
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
                        <img src={module.content.imageUrl || 'https://via.placeholder.com/1200x500'} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
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
                    {/* Simplified renderers for preview */}
                    {['categories', 'products', 'carousel', 'video', 'coupon_slider', 'flash_sale'].includes(module.type) && (
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
