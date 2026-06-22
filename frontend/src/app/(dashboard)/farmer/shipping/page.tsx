'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ShippingManagementPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeTab, setActiveTab] = useState('to ship'); // default to 'to ship'
  
  // Search inputs
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [buyerSearch, setBuyerSearch] = useState('');
  const [dateRange, setDateRange] = useState('');
  
  // Dashboard info for the sidebar
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadSidebarData();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page, activeTab]);

  const loadSidebarData = async () => {
    try {
      const [dashRes, userRes, notifRes] = await Promise.all([
        api.getFarmerDashboard().catch(() => ({})),
        api.getUserProfile().catch(() => ({ user: null })),
        api.getNotifications().catch(() => ({ notifications: [] }))
      ]);
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
    } catch (error) {
      console.error("Failed to load sidebar data", error);
    }
  };

  const loadOrders = async (searchOverride?: string) => {
    try {
      setLoading(true);
      
      const searchTerm = searchOverride !== undefined 
        ? searchOverride 
        : (orderIdSearch || buyerSearch) ? `${orderIdSearch} ${buyerSearch}`.trim() : undefined;

      let mappedStatus = activeTab;
      if (mappedStatus === 'to ship') mappedStatus = 'confirmed';
      if (mappedStatus === 'in transit') mappedStatus = 'in_transit';
      if (mappedStatus === 'delivered') mappedStatus = 'delivered';
      if (mappedStatus === 'all') mappedStatus = '';

      const res = await api.getFarmerOrders({
        page,
        limit: 10,
        status: mappedStatus === 'all' ? undefined : mappedStatus,
        search: searchTerm || undefined
      });

      setOrders(res.orders || []);
      setTotalPages(res.pagination?.total_pages || 1);
      setTotalOrders(res.pagination?.total || 0);
    } catch (error) {
      console.error("Failed to load shipping data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleReset = () => {
    setOrderIdSearch('');
    setProductSearch('');
    setBuyerSearch('');
    setDateRange('');
    setPage(1);
    loadOrders('');
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      loadOrders();
      loadSidebarData(); // refresh sidebar counts
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const pendingShipments = dashboardData?.summary?.pending_orders || 0;
  const inTransitCount = dashboardData?.summary?.in_transit_orders || 0;
  const unreadMessages = notifications.filter(n => !n.is_read).length;

  const tabs = [
    { id: 'to ship', label: 'To Ship', count: pendingShipments },
    { id: 'in transit', label: 'In Transit', count: inTransitCount },
    { id: 'delivered', label: 'Delivered', count: dashboardData?.summary?.delivered_orders || 0 },
  ];

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR */}
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

          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</div>
          <Link href="/farmer/orders" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors justify-between">
            <div className="flex items-center">
              <span className="material-symbols-outlined mr-3 text-[20px]">receipt_long</span>
              <span className="text-sm">All Orders</span>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{dashboardData?.summary?.total_orders_received || 0}</span>
          </Link>
          <Link href="/farmer/shipping" className="flex items-center px-4 py-2.5 bg-green-50 text-[#2d9a33] border-r-4 border-[#2d9a33] transition-colors justify-between">
            <div className="flex items-center">
              <span className="material-symbols-outlined mr-3 text-[20px]">local_shipping</span>
              <span className="font-medium text-sm">Shipping</span>
            </div>
            {pendingShipments > 0 && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{pendingShipments}</span>}
          </Link>
          <Link href="/farmer/returns" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">assignment_return</span>
            <span className="text-sm">Returns & Refunds</span>
          </Link>

          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Marketing & Store</div>
          <Link href="/farmer/campaigns" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">campaign</span>
            <span className="text-sm">Campaigns</span>
          </Link>
          <Link href="/farmer/store" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">storefront</span>
            <span className="text-sm">Store Decoration</span>
          </Link>

          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Intelligence</div>
          <Link href="/farmer/advisor" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">bar_chart</span>
            <span className="text-sm">Business Advisor</span>
          </Link>
          <Link href="/farmer/market" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined mr-3 text-[20px]">trending_up</span>
            <span className="text-sm">Market Insights</span>
          </Link>
        </div>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
          GreenHarvest Seller © {new Date().getFullYear()}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Shipping Management</h1>
            <p className="ml-4 text-sm text-gray-500 font-medium hidden md:block">Track and dispatch your outgoing deliveries.</p>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden lg:block">
            <div className="flex items-center bg-gray-100/80 border border-gray-200 rounded-full px-4 py-2 w-full transition-all duration-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2d9a33]/20 focus-within:border-[#2d9a33]">
              <span className="material-symbols-outlined text-gray-400 text-[20px] mr-2">search</span>
              <input 
                type="text" 
                placeholder="Search shipments..." 
                className="w-full bg-transparent border-none focus:outline-none text-sm text-gray-700 placeholder-gray-400"
                value={orderIdSearch}
                onChange={(e) => setOrderIdSearch(e.target.value)}
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
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
              {unreadMessages > 0 && (
                <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {unreadMessages}
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
          <div className="max-w-[1440px] mx-auto space-y-6">
            
            <div className="flex justify-end gap-3 mb-2">
              <button className="px-4 py-2 bg-[#2d9a33] hover:bg-[#25822a] text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">print</span>
                Batch Print Waybills
              </button>
            </div>

            {/* TABS */}
            <div className="bg-white rounded-t-xl border-b-2 border-transparent px-2 flex overflow-x-auto custom-scrollbar space-x-6 text-sm font-medium border-x border-t border-gray-200">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                let badgeClass = 'bg-gray-100 text-gray-600';
                if (isActive) badgeClass = 'bg-[#2d9a33] text-white';
                else if (tab.id === 'to ship' && tab.count > 0) badgeClass = 'bg-orange-100 text-orange-600';
                else if (tab.id === 'in transit' && tab.count > 0) badgeClass = 'bg-[#fff200] text-gray-900';

                return (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setPage(1); }}
                    className={`py-4 px-2 whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${isActive ? 'border-[#2d9a33] text-[#2d9a33]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                    style={{ marginBottom: '-2px' }}
                  >
                    {tab.label} {tab.count !== undefined && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>{tab.count}</span>}
                  </button>
                );
              })}
            </div>

            {/* FILTERS */}
            <div className="bg-white border-x border-b border-gray-200 p-6 flex flex-wrap gap-4 items-end rounded-b-xl shadow-sm mb-6">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-2">Tracking ID / Order ID</label>
                <input 
                  type="text" 
                  value={orderIdSearch}
                  onChange={(e) => setOrderIdSearch(e.target.value)}
                  placeholder="e.g. GH-2023-..." 
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-2">Delivery Partner</label>
                <input 
                  type="text" 
                  placeholder="Carrier name" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-2">Destination</label>
                <input 
                  type="text" 
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  placeholder="City or Buyer Info" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-bold transition-colors">
                  Reset
                </button>
                <button onClick={handleSearch} className="px-6 py-2.5 bg-[#2d9a33] hover:bg-[#25822a] text-white rounded-lg text-sm font-bold transition-colors">
                  Search
                </button>
              </div>
            </div>

            {/* SHIPPING TABLE */}
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-10 h-10 border-4 border-[#2d9a33] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4 w-12"><input type="checkbox" className="rounded border-gray-300 text-[#2d9a33] focus:ring-[#2d9a33] cursor-pointer" /></th>
                        <th className="p-4">PARCEL INFO</th>
                        <th className="p-4">LOGISTICS</th>
                        <th className="p-4">DESTINATION</th>
                        <th className="p-4">STATUS</th>
                        <th className="p-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">local_shipping</span>
                              <p className="font-bold text-gray-900 text-lg">No shipments found</p>
                              <p className="text-sm mt-1 mb-4">Try adjusting your filters or check a different tab.</p>
                            </div>
                          </td>
                        </tr>
                      ) : orders.map((order) => {
                        const item = order.items && order.items[0] ? order.items[0] : null;
                        const dateObj = new Date(order.created_at);
                        const dateStr = dateObj.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
                        const timeStr = dateObj.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false});
                        
                        let statusBadge = null;
                        if (order.order_status === 'pending') {
                          statusBadge = <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">Pending</span>;
                        } else if (order.order_status === 'confirmed') {
                          statusBadge = <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Ready to Ship</span>;
                        } else if (order.order_status === 'in_transit') {
                          statusBadge = <span className="bg-[#fff200] text-gray-900 px-3 py-1 rounded-full text-xs font-bold">In Transit</span>;
                        } else if (order.order_status === 'delivered') {
                          statusBadge = <span className="bg-[#4caf50] text-white px-3 py-1 rounded-full text-xs font-bold">Delivered</span>;
                        } else if (order.order_status === 'cancelled') {
                          statusBadge = <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">Cancelled</span>;
                        } else {
                          statusBadge = <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{order.order_status}</span>;
                        }
                        
                        return (
                          <tr key={order.order_id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-4">
                              <input type="checkbox" className="rounded border-gray-300 text-[#2d9a33] focus:ring-[#2d9a33] cursor-pointer" />
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-900 line-clamp-1">{item?.product_name}</p>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">Order ID: GH-2023-{order.order_id.toString().padStart(5, '0')}</p>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">Weight: {item?.quantity || 0} kg</p>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-[18px]">local_shipping</span>
                                <p className="font-bold text-gray-800 text-sm">Standard Delivery</p>
                              </div>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">Dispatched: {dateStr}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-900">{order.buyer_name}</p>
                              <p className="text-xs text-gray-500 font-medium">{order.buyer_email || 'No email'}</p>
                            </td>
                            <td className="p-4">
                              {statusBadge}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-3">
                                {order.order_status === 'confirmed' ? (
                                  <button onClick={() => handleUpdateStatus(order.order_id, 'in_transit')} className="text-sm font-bold text-[#2d9a33] hover:underline">
                                    Mark as Shipped
                                  </button>
                                ) : order.order_status === 'in_transit' ? (
                                  <button onClick={() => handleUpdateStatus(order.order_id, 'delivered')} className="text-sm font-bold text-[#2d9a33] hover:underline">
                                    Mark Delivered
                                  </button>
                                ) : (
                                  <button className="text-sm font-bold text-gray-500 hover:text-gray-700">Track</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* PAGINATION */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Showing {orders.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, totalOrders)} of {totalOrders.toLocaleString()} shipments</span>
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
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
