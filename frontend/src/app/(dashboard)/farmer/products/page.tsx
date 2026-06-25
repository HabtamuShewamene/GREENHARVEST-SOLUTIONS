'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function ManageProductsPage() {
  const router = useRouter();
  const { showError } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('All');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, activeTab]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.row-action-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadData = async (searchOverride?: string, categoryOverride?: string, statusOverride?: string) => {
    try {
      setLoading(true);

      const searchTerm = searchOverride !== undefined ? searchOverride : searchQuery;
      const category = categoryOverride !== undefined ? categoryOverride : (categoryFilter === 'All Categories' ? undefined : categoryFilter);
      let stockStatus = undefined;

      const effectiveStatusFilter = statusOverride !== undefined ? statusOverride : statusFilter;

      if (activeTab === 'On Sale' || effectiveStatusFilter === 'On Sale') {
        stockStatus = 'in_stock';
      } else if (activeTab === 'Sold Out' || effectiveStatusFilter === 'Sold Out') {
        stockStatus = 'out_of_stock';
      } else if (effectiveStatusFilter === 'Low Stock') {
        stockStatus = 'low_stock';
      }

      const [productsRes, categoriesRes, dashRes, userRes, notifRes] = await Promise.all([
        api.getFarmerProducts({
          page,
          limit: 10,
          search: searchTerm || undefined,
          category: category,
          stock_status: stockStatus,
        }),
        api.getCategories(),
        api.getFarmerDashboard().catch(() => ({})),
        api.getUserProfile().catch(() => ({ user: null })),
        api.getNotifications().catch(() => ({ notifications: [] }))
      ]);

      setProducts(productsRes.products || []);
      setTotalPages(productsRes.pagination?.total_pages || 1);
      setTotalProducts(productsRes.pagination?.total || 0);
      setCategories(categoriesRes.categories || []);
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingShipments = dashboardData?.pending_shipments?.length || 0;
  const unreadMessages = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(products.map(p => p.id.toString())));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete product', error);
      showError('Failed to delete product');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await api.batchUpdateProductStatus([id], 'deactivated');
      loadData();
    } catch (error) {
      console.error('Failed to deactivate product', error);
      showError('Failed to deactivate product');
    }
  };

  const handleBatchAction = async (action: 'delete' | 'deactivate' | 'reactivate') => {
    if (!window.confirm(`Are you sure you want to ${action} ${selectedItems.size} products?`)) return;
    try {
      await api.batchUpdateProducts(Array.from(selectedItems), action);
      setSelectedItems(new Set());
      loadData();
    } catch (error) {
      console.error(`Failed to ${action} products`, error);
      showError(`Failed to ${action} products`);
    }
  };

  const handleExport = async () => {
    try {
      await api.exportFarmerProductsCSV();
    } catch (error) {
      console.error("Failed to export products", error);
      showError('Failed to export products');
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleReset = () => {
    setSearchQuery('');
    setCategoryFilter('All Categories');
    setStatusFilter('All Status');
    setPage(1);
    loadData('', 'All Categories', 'All Status');
  };

  // Status handling via tabs resets page
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  // For UI tabs
  const onSaleCount = dashboardData?.summary?.total_products ? dashboardData.summary.total_products - dashboardData.summary.out_of_stock_products : 0;
  const soldOutCount = dashboardData?.summary?.out_of_stock_products || 0;
  const totalCount = dashboardData?.summary?.total_products || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-12 h-12 border-4 border-[#2a6810] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>



      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]">

        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Manage Products</h1>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className="flex items-center bg-gray-100/80 border border-gray-200 rounded-full px-4 py-2 w-full transition-all duration-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2d9a33]/20 focus-within:border-[#2d9a33]">
              <span className="material-symbols-outlined text-gray-400 text-[20px] mr-2">search</span>
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-transparent border-none focus:outline-none text-sm text-gray-700 placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          <div className="flex items-center space-x-5 ml-auto">
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-[24px]">notifications_none</span>
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {notifications.length}
                </span>
              )}
            </button>

            <div className="h-8 w-px bg-gray-200 mx-2"></div>

            {/* USER PROFILE */}
            <div className="flex items-center cursor-pointer group relative pl-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2d9a33] to-[#74df41] p-[2px] mr-3">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border border-white">
                  {user?.image_url ? (
                    <img src={user.image_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#2d9a33] font-bold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto space-y-6">

            {/* TABS */}
            <div className="bg-white rounded-xl border border-gray-200 px-2 flex space-x-6 text-sm font-medium">
              <button
                onClick={() => handleTabChange('All')}
                className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'All' ? 'border-[#2d9a33] text-[#2d9a33]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              >
                All <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'All' ? 'bg-[#2d9a33] text-white' : 'bg-gray-100 text-gray-600'}`}>{totalCount}</span>
              </button>
              <button
                onClick={() => handleTabChange('On Sale')}
                className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'On Sale' ? 'border-[#2d9a33] text-[#2d9a33]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              >
                On Sale <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'On Sale' ? 'bg-[#2d9a33] text-white' : 'bg-gray-100 text-gray-600'}`}>{onSaleCount}</span>
              </button>
              <button
                onClick={() => handleTabChange('Sold Out')}
                className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Sold Out' ? 'border-[#2d9a33] text-[#2d9a33]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              >
                Sold Out <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'Sold Out' ? 'bg-[#2d9a33] text-white' : 'bg-gray-100 text-gray-600'}`}>{soldOutCount}</span>
              </button>
              <button
                onClick={() => setActiveTab('Under Review')}
                className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Under Review' ? 'border-[#2d9a33] text-[#2d9a33]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              >
                Under Review <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'Under Review' ? 'bg-[#2d9a33] text-white' : 'bg-gray-100 text-gray-600'}`}>0</span>
              </button>
              <button
                onClick={() => setActiveTab('Drafts')}
                className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Drafts' ? 'border-[#2d9a33] text-[#2d9a33]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              >
                Drafts <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'Drafts' ? 'bg-[#2d9a33] text-white' : 'bg-gray-100 text-gray-600'}`}>0</span>
              </button>
            </div>

            {/* FILTERS */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Product Name / ID</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm"
                />
              </div>
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Category</label>
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm appearance-none cursor-pointer"
                  >
                    <option value="All Categories">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Stock Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm appearance-none cursor-pointer"
                  >
                    <option value="All Status">All Status</option>
                    <option value="On Sale">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Sold Out">Sold Out</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSearch} className="px-6 py-2.5 bg-[#2d9a33] hover:bg-[#25822a] text-white rounded-lg text-sm font-bold transition-colors">
                  Search
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  disabled={selectedItems.size === 0}
                  onClick={() => handleBatchAction('delete')}
                  className={`px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${selectedItems.size > 0 ? 'text-red-600 hover:bg-red-50 border-red-200' : 'text-gray-400 cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete
                </button>
                <button
                  disabled={selectedItems.size === 0}
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to deactivate ${selectedItems.size} products?`)) return;
                    try {
                      await api.batchUpdateProductStatus(Array.from(selectedItems), 'deactivated');
                      setSelectedItems(new Set());
                      loadData();
                    } catch (error) {
                      console.error('Failed to deactivate products', error);
                      showError('Failed to deactivate products');
                    }
                  }}
                  className={`px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${selectedItems.size > 0 ? 'text-orange-600 hover:bg-orange-50 border-orange-200' : 'text-gray-400 cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                  Deactivate
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-bold text-gray-700 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export
                </button>
              </div>
              <div className="text-sm text-gray-500 font-medium">
                {selectedItems.size} items selected
              </div>
            </div>

            {/* PRODUCTS TABLE */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="p-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === products.length && products.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-[#2d9a33] focus:ring-[#2d9a33] cursor-pointer"
                        />
                      </th>
                      <th className="p-4 min-w-[250px]">Product Info</th>
                      <th className="p-4">SKU/ID</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4 text-center">Sales (30D)</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">inventory_2</span>
                            <p className="font-bold text-gray-900 text-lg">No products found</p>
                            <p className="text-sm mt-1 mb-4">Try adjusting your filters or add a new product.</p>
                            <Link href="/farmer/products/new" className="px-6 py-2 bg-[#2d9a33] text-white rounded-lg font-bold hover:bg-[#25822a] transition-colors">
                              Add New Product
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : products.map((product) => {
                      const isLowStock = product.stock > 0 && product.stock <= 50; // heuristic

                      return (
                        <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(product.id.toString())}
                              onChange={() => handleSelectItem(product.id.toString())}
                              className="rounded border-gray-300 text-[#2d9a33] focus:ring-[#2d9a33] cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                                {product.image_url ? (
                                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined text-gray-400">image</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 line-clamp-1">{product.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-500 font-mono text-sm">T-{product.id}</td>
                          <td className="p-4 text-gray-600">{product.category_name || 'Uncategorized'}</td>
                          <td className="p-4 font-bold text-gray-900">${Number(product.price).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={product.stock === 0 ? 'text-red-600 font-bold' : isLowStock ? 'text-orange-600 font-bold' : 'text-gray-900'}>
                              {product.stock} <span className="text-gray-500 font-normal text-xs ml-0.5">kg</span>
                            </span>
                          </td>
                          <td className="p-4 text-center font-medium text-gray-600">{product.units_sold || 0}</td>
                          <td className="p-4">
                            {product.status === 'deactivated' ? (
                              <span className="inline-flex bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                Inactive
                              </span>
                            ) : product.status === 'draft' ? (
                              <span className="inline-flex bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                Draft
                              </span>
                            ) : product.stock === 0 ? (
                              <span className="inline-flex flex-col bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider leading-tight text-center">
                                <span>Sold</span><span>Out</span>
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex flex-col bg-[#fff200] text-gray-900 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider leading-tight text-center">
                                <span>Low</span><span>Stock</span>
                              </span>
                            ) : (
                              <span className="inline-flex flex-col bg-[#4caf50] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider leading-tight text-center">
                                <span>On</span><span>Sale</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-3">
                              <Link href={`/farmer/products/edit/${product.id}`} className="text-sm font-bold text-[#2d9a33] hover:underline">
                                Edit
                              </Link>
                              <button onClick={() => handleDeactivate(product.id.toString())} className="text-sm font-bold text-gray-600 hover:text-red-600 transition-colors">
                                Deactivate
                              </button>
                              <div className="relative row-action-menu">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === product.id.toString() ? null : product.id.toString())}
                                  className="text-gray-400 hover:text-gray-600 flex items-center"
                                >
                                  <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                                </button>
                                {openMenuId === product.id.toString() && (
                                  <div className="absolute right-0 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                    <button
                                      onClick={() => { router.push(`/farmer/products/edit/${product.id}`); setOpenMenuId(null); }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                                    </button>
                                    <button
                                      onClick={() => { handleDeactivate(product.id.toString()); setOpenMenuId(null); }}
                                      className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">power_settings_new</span> Deactivate
                                    </button>
                                    <button
                                      onClick={() => { handleDelete(product.id.toString()); setOpenMenuId(null); }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Showing {products.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, totalProducts)} of {totalProducts.toLocaleString()} entries</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded bg-[#2d9a33] text-white font-bold">{page}</button>
                  {page < totalPages && (
                    <button onClick={() => setPage(page + 1)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold">{page + 1}</button>
                  )}
                  {page + 1 < totalPages && (
                    <button onClick={() => setPage(page + 2)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold">{page + 2}</button>
                  )}
                  {page + 2 < totalPages && <span className="px-2 text-gray-400">...</span>}
                  {page + 2 < totalPages && (
                    <button onClick={() => setPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold">{totalPages}</button>
                  )}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
