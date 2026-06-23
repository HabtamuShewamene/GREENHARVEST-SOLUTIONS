'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FarmerDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, userRes, notifRes] = await Promise.all([
        api.getFarmerDashboard().catch(() => ({})),
        api.getUserProfile().catch(() => ({ user: null })),
        api.getNotifications().catch(() => ({ notifications: [] }))
      ]);
      
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
    } catch (error) {
      console.error("Failed to load farmer dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      // Reload dashboard data to reflect changes
      loadDashboard();
    } catch (error) {
      console.error("Failed to update order status", error);
      alert("Failed to update order status. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Fallback data for visual presentation if backend is empty
  const summary = dashboardData?.summary || {
    today_revenue: 0,
    today_orders: 0,
    revenue_earned: 0,
    total_orders_received: 0
  };

  const recentOrders = dashboardData?.recent_orders || [];

  const pendingShipments = dashboardData?.pending_shipments?.length || 0;
  const lowStockItems = dashboardData?.low_stock_items?.length || 0;
  const unreadMessages = notifications.filter(n => !n.is_read).length;

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
          <Link href="/farmer/dashboard" className="flex items-center px-4 py-2.5 bg-green-50 text-[#2d9a33] border-r-4 border-[#2d9a33]">
            <span className="material-symbols-outlined mr-3 text-[20px]">dashboard</span>
            <span className="font-medium text-sm">Overview</span>
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
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{dashboardData?.summary?.total_orders_received || 18}</span>
          </Link>
          <Link href="/farmer/shipping" className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors justify-between">
            <div className="flex items-center">
              <span className="material-symbols-outlined mr-3 text-[20px]">local_shipping</span>
              <span className="text-sm">Shipping</span>
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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
          {/* SEARCH BAR */}
          <div className="flex-1 max-w-2xl">
            <div className="flex items-center bg-gray-50/50 border border-gray-200 rounded-full px-4 py-2 w-full transition-all duration-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2d9a33]/20 focus-within:border-[#2d9a33]">
              <span className="material-symbols-outlined text-gray-400 text-[20px] mr-2">search</span>
              <input 
                type="text" 
                placeholder="Search orders, products, or buyers..." 
                className="w-full bg-transparent border-none focus:outline-none text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-5 ml-6">
            {/* MESSAGES */}
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
              {unreadMessages > 0 && (
                <span className="absolute top-2 right-2 bg-[#f27421] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {unreadMessages}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS */}
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
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#2d9a33] transition-colors">{user?.name}</p>

              <span className="material-symbols-outlined text-gray-400 ml-2 group-hover:text-gray-600 transition-colors">expand_more</span>
              </div>
              {/* DROPDOWN MENU */}
              <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Link href="/farmer/profile" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f8f9fa] hover:text-[#2d9a33] transition-colors">
                  <span className="material-symbols-outlined text-[18px] mr-3">person</span> My Profile
                </Link>
                
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px] mr-3">logout</span> Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f9fa]">
          <div className="w-full max-w-[1440px] mx-auto p-6 md:p-8 flex flex-col xl:flex-row gap-8">
            
            <div className="flex-1 flex flex-col gap-8 min-w-0">
              {/* SNAPSHOT ROW */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-wrap md:flex-nowrap items-center shadow-sm">
                <div className="flex items-center border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 pr-0 md:pr-8 mr-0 md:mr-8 mb-4 md:mb-0 w-full md:w-auto">
                <span className="material-symbols-outlined text-gray-400 mr-2 text-[28px]">calendar_today</span>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Today's</p>
                  <p className="text-sm font-semibold text-gray-700">Snapshot</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today's Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">ETB {Number(summary.today_revenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today's Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{summary.today_orders || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">ETB {Number(summary.revenue_earned || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_orders_received || 0}</p>
                </div>
              </div>

              <div className="pl-4 ml-auto">
                <Link href="/farmer/analytics" className="text-sm text-[#2d9a33] hover:underline flex flex-col items-center">
                  <span>Detailed</span>
                  <span>Analytics</span>
                  <span className="material-symbols-outlined text-[16px] mt-1">open_in_new</span>
                </Link>
              </div>
            </div>

              {/* PERFORMANCE CHARTS */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800">Business<br/>Performance</h2>
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button 
                    onClick={() => setChartMetric('revenue')}
                    className={`px-4 py-1.5 text-sm font-medium border-r border-gray-300 transition-colors ${chartMetric === 'revenue' ? 'bg-[#e8f5e9] text-[#2d9a33]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Revenue
                  </button>
                  <button 
                    onClick={() => setChartMetric('orders')}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${chartMetric === 'orders' ? 'bg-[#e8f5e9] text-[#2d9a33]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Orders
                  </button>
                </div>
              </div>

                <div className="flex flex-col md:flex-row gap-6 h-auto md:h-72">
                {/* Line Chart Area (Weekly Sales) */}
                  <div className="flex-1 bg-[#fcfdfd] border border-gray-100 rounded-lg p-5 relative overflow-hidden flex items-center justify-center min-h-[200px]">
                  <span className="text-sm text-gray-400 absolute top-4 left-4 font-medium">Weekly Sales Trend</span>
                  
                  {(() => {
                    const sales = dashboardData?.weekly_sales || [];
                    if (sales.length === 0) return <div className="text-gray-400 text-sm mt-8">No data available</div>;
                    
                    const dataPoints = sales.map((s: any) => Number(s[chartMetric]) || 0);
                    const maxValue = Math.max(...dataPoints, chartMetric === 'revenue' ? 100 : 10);
                    
                    // Simple path generation
                    let d = "";
                    let dArea = "";
                    
                    if (sales.length === 1) {
                      d = `M 0 130 L 400 130`;
                      dArea = `M 0 130 L 400 130 L 400 150 L 0 150 Z`;
                    } else {
                      const points = sales.map((s: any, i: number) => {
                        const x = (i / (sales.length - 1)) * 400;
                        const y = 130 - (dataPoints[i] / maxValue) * 110; // 20 to 130
                        return { x, y };
                      });
                      
                      d = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(" ");
                      dArea = d + ` L 400 150 L 0 150 Z`;
                    }
                    
                    return (
                      <svg className="w-full h-full mt-6" viewBox="0 0 400 150" preserveAspectRatio="none">
                        <path d={d} fill="none" stroke="#8bc34a" strokeWidth="4" strokeLinejoin="round" />
                        <path d={dArea} fill="url(#grad1)" opacity="0.2" />
                        <defs>
                          <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor: '#8bc34a', stopOpacity: 1}} />
                            <stop offset="100%" style={{stopColor: '#ffffff', stopOpacity: 0}} />
                          </linearGradient>
                        </defs>
                      </svg>
                    );
                  })()}
                </div>

                {/* Bar Chart Area (Top Selling Categories) */}
                  <div className="w-full md:w-1/3 bg-[#fcfdfd] border border-gray-100 rounded-lg p-5 relative flex flex-col items-center">
                   <span className="text-sm text-gray-400 font-medium mb-auto text-center w-full">Top Selling<br/>Categories</span>
                   
                   <div className="flex items-end justify-center gap-2 sm:gap-4 h-40 w-full mt-4">
                     {(() => {
                        const cats = dashboardData?.category_breakdown || [];
                        if (cats.length === 0) return <div className="text-gray-400 text-sm mb-16">No sales yet</div>;
                        
                        const maxUnits = Math.max(...cats.map((c: any) => Number(c.units_sold) || 0), 10);
                        const colors = ['#4caf50', '#81c784', '#aed581', '#dcedc8', '#e8f5e9'];
                        
                        return cats.slice(0, 4).map((c: any, i: number) => {
                          const heightPct = Math.max(((Number(c.units_sold) || 0) / maxUnits) * 100, 5);
                          return (
                           <div key={i} className="flex flex-col items-center w-full max-w-[48px]">
                             <div className="w-full rounded-t-sm" style={{height: `${heightPct}%`, backgroundColor: colors[i % colors.length]}}></div>
                             <span className="text-[10px] sm:text-xs text-gray-500 mt-2 truncate w-full text-center" title={c.category_name}>{c.category_name || 'Other'}</span>
                           </div>
                          );
                        });
                     })()}
                   </div>
                </div>
              </div>
            </div>

              {/* RECENT ORDERS TABLE */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-bold text-gray-800">Recent Orders Management</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Search Order ID" 
                      className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500 w-48"
                    />
                  </div>
                  <button className="text-[#2d9a33] text-sm font-medium hover:underline px-2">Export List</button>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium w-10"><input type="checkbox" className="rounded text-green-500 focus:ring-green-500 cursor-pointer" /></th>
                      <th className="p-4 font-medium">Order Details</th>
                      <th className="p-4 font-medium">Buyer Info</th>
                      <th className="p-4 font-medium">Product Info</th>
                      <th className="p-4 font-medium">Amount (ETB)</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-2">inbox</span>
                            <p className="font-medium text-gray-600">No recent orders found</p>
                            <p className="text-xs mt-1">When customers place orders, they will appear here.</p>
                          </div>
                        </td>
                      </tr>
                    ) : recentOrders.map((order: any, idx: number) => {
                      const item = order.items && order.items[0] ? order.items[0] : null;
                      const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
                      
                      let statusStyles = "";
                      let statusText = order.order_status;
                      
                      switch(order.order_status) {
                        case 'pending':
                          statusStyles = "bg-orange-100 text-orange-700";
                          statusText = "Pending Shipment";
                          break;
                        case 'in_transit':
                          statusStyles = "bg-blue-100 text-blue-700";
                          statusText = "In Transit";
                          break;
                        case 'delivered':
                          statusStyles = "bg-green-100 text-green-700";
                          statusText = "Delivered";
                          break;
                        default:
                          statusStyles = "bg-gray-100 text-gray-700";
                      }

                      return (
                        <tr key={order.order_id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4"><input type="checkbox" className="rounded text-green-500 focus:ring-green-500 cursor-pointer" /></td>
                          <td className="p-4">
                            <Link href={`/farmer/orders/${order.order_id}`} className="font-semibold text-[#2d9a33] hover:underline block">#{order.order_id}</Link>
                            <span className="text-xs text-gray-500">{dateStr}</span>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-gray-800">{order.buyer_name}</p>
                            <p className="text-xs text-gray-500 flex items-center mt-0.5">
                              <span className="material-symbols-outlined text-[12px] mr-1">location_on</span>
                              {order.buyer_location || 'Address not set'}
                            </p>
                          </td>
                          <td className="p-4">
                            {item && (
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-100 rounded-md mr-3 flex items-center justify-center overflow-hidden">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="material-symbols-outlined text-gray-400 text-xs">image</span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{item.product_name}</p>
                                  <p className="text-xs text-gray-500">Qty: {item.quantity} kg</p>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-semibold text-gray-800">{Number(order.total_amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded text-xs font-medium ${statusStyles}`}>{statusText}</span>
                          </td>
                          <td className="p-4 text-right">
                            {order.order_status === 'pending' ? (
                              <button onClick={() => handleUpdateOrderStatus(order.order_id, 'confirmed')} className="bg-[#2d9a33] hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">Fulfill</button>
                            ) : order.order_status === 'in_transit' ? (
                              <button className="bg-white border border-[#2d9a33] text-[#2d9a33] hover:bg-green-50 px-3 py-1.5 rounded text-sm font-medium transition-colors">Track</button>
                            ) : (
                              <button className="text-gray-500 hover:text-gray-700 text-sm font-medium">View</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
                <span>Showing {recentOrders.length > 0 ? '1' : '0'}-{recentOrders.length} of {dashboardData?.summary?.total_orders_received || 0} orders</span>
                <div className="flex gap-1">
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                  <button className="px-3 py-1 bg-[#2d9a33] text-white border border-[#2d9a33] rounded">1</button>
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</button>
                </div>
              </div>
            </div>
            </div>
            
            {/* RIGHT SIDEBAR (Widgets) */}
            <div className="w-full xl:w-[340px] flex flex-col gap-8 flex-shrink-0">
              
              {/* TO-DO LIST */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-800">To-Do List</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <Link href="/farmer/shipping" className="flex items-start p-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-800 text-sm group-hover:text-[#2d9a33] transition-colors">{pendingShipments} Pending Shipments</p>
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">chevron_right</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ship within 24h to avoid penalties</p>
                  </div>
                </Link>
                
                <Link href="/farmer/products?filter=low_stock" className="flex items-start p-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-800 text-sm group-hover:text-[#2d9a33] transition-colors">{lowStockItems} Low Stock Items</p>
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">chevron_right</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Onion inventory below threshold</p>
                  </div>
                </Link>

                <Link href="/farmer/messages" className="flex items-start p-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-800 text-sm group-hover:text-[#2d9a33] transition-colors">{unreadMessages} Unread Message</p>
                      <span className="material-symbols-outlined text-gray-400 text-[18px]">chevron_right</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Inquiry about bulk discount</p>
                  </div>
                </Link>
              </div>
            </div>

              {/* MARKET INSIGHTS */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
                <span className="material-symbols-outlined text-[#f27421] mr-2">lightbulb</span>
                <h3 className="font-bold text-gray-800">Market Insights</h3>
              </div>
              
              <div className="p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Trending Keywords</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {(() => {
                    const trends = dashboardData?.market_insights?.trending_keywords || [];
                    if (trends.length === 0) return <span className="text-xs text-gray-500">Not enough market data yet.</span>;
                    return trends.map((t: any, i: number) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                        {t.name} <span className="material-symbols-outlined text-green-500 text-[14px] ml-1">trending_up</span>
                      </span>
                    ));
                  })()}
                </div>

                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Price Benchmark</p>
                {(() => {
                  const pb = dashboardData?.market_insights?.price_benchmark;
                  if (!pb) {
                    return (
                      <div className="bg-gray-50 border border-gray-100 rounded-md p-3 text-sm text-gray-500">
                        Add more products to see price benchmarks against the market average.
                      </div>
                    );
                  }

                  const myPrice = Number(pb.my_price) || 0;
                  const avgPrice = Number(pb.avg_category_price) || 0;
                  const diff = myPrice - avgPrice;
                  const diffPct = avgPrice > 0 ? Math.round((Math.abs(diff) / avgPrice) * 100) : 0;
                  
                  let message = "";
                  let subtext = "";
                  let iconColor = "text-orange-500";
                  let bgClass = "bg-orange-50 border-orange-100";
                  let actionText = "Adjust Price";

                  if (diff > 0) {
                    message = `Your ${pb.product_name} price is ${diffPct}% higher`;
                    subtext = `Consider a small discount to stay competitive in the ${pb.category_name} category.`;
                  } else if (diff < 0) {
                    message = `Your ${pb.product_name} price is ${diffPct}% lower`;
                    subtext = `You're offering a highly competitive price for the ${pb.category_name} category!`;
                    iconColor = "text-green-500";
                    bgClass = "bg-green-50 border-green-100";
                    actionText = "View Market";
                  } else {
                    message = `Your ${pb.product_name} price matches the average`;
                    subtext = `Your pricing is perfectly aligned with the ${pb.category_name} category market.`;
                    iconColor = "text-blue-500";
                    bgClass = "bg-blue-50 border-blue-100";
                    actionText = "View Market";
                  }

                  return (
                    <div className={`${bgClass} border rounded-md p-3 relative`}>
                      <span className={`material-symbols-outlined ${iconColor} absolute top-3 left-3 text-[18px]`}>info</span>
                      <div className="pl-7">
                        <p className="text-sm font-semibold text-gray-800">{message}</p>
                        <p className="text-xs text-gray-600 mt-1">{subtext}</p>
                        <Link href="/farmer/products" className={`mt-2 inline-block text-xs font-bold ${iconColor} hover:underline uppercase`}>
                          {actionText}
                        </Link>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

              {/* SELLER RESOURCES */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Seller Resources</h3>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 border-b border-gray-100">
                <Link href="/farmer/resources/training" className="p-4 flex items-center justify-center flex-col gap-2 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#2d9a33]">
                  <span className="material-symbols-outlined">school</span>
                  <span className="text-xs font-medium text-center">Training Hub</span>
                </Link>
                <Link href="/farmer/support" className="p-4 flex items-center justify-center flex-col gap-2 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#2d9a33]">
                  <span className="material-symbols-outlined">headset_mic</span>
                  <span className="text-xs font-medium text-center">Contact Support</span>
                </Link>
                <Link href="/farmer/resources/rules" className="p-4 flex items-center justify-center flex-col gap-2 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#2d9a33]">
                  <span className="material-symbols-outlined">gavel</span>
                  <span className="text-xs font-medium text-center">Platform Rules</span>
                </Link>
                <Link href="/farmer/forum" className="p-4 flex items-center justify-center flex-col gap-2 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#2d9a33]">
                  <span className="material-symbols-outlined">forum</span>
                  <span className="text-xs font-medium text-center">Seller Forum</span>
                </Link>
              </div>

            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
