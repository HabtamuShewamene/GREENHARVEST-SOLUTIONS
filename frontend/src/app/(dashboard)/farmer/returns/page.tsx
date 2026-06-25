'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function ReturnsManagementPage() {
  const router = useRouter();
  const { showError } = useToast();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  
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
    loadReturns();
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

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getReturns({ page, limit: 10 });
      setReturns(res.returns || []);
      setTotalPages(res.pagination?.total_pages || 1);
      setTotalReturns(res.pagination?.total || 0);
    } catch (err: any) {
      setError('Failed to load returns. Please try again.');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadReturns();
  };

  const handleReset = () => {
    setOrderIdSearch('');
    setProductSearch('');
    setBuyerSearch('');
    setDateRange('');
    setPage(1);
    loadReturns();
  };

  const handleReturnAction = async (returnId: string | number, action: 'accept' | 'reject') => {
    try {
      await api.updateReturn(returnId, action);
      loadReturns();
    } catch (error: any) {
      const msg = error?.response?.data?.message || `Failed to ${action} return`;
      showError(msg);
    }
  };

  const pendingShipments = dashboardData?.summary?.pending_orders || 0;
  const unreadMessages = notifications.filter(n => !n.is_read).length;

  const tabs = [
    { id: 'all', label: 'All Returns', count: totalReturns },
    { id: 'pending approval', label: 'Pending Approval', count: 0 },
    { id: 'processing', label: 'Processing Refund', count: 0 },
    { id: 'resolved', label: 'Resolved', count: 0 },
  ];

  return (
    <>
      
      

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Returns & Refunds</h1>
            <p className="ml-4 text-sm text-gray-500 font-medium hidden md:block">Review, process, and track customer return requests.</p>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden lg:block">
            <div className="flex items-center bg-gray-100/80 border border-gray-200 rounded-full px-4 py-2 w-full transition-all duration-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2d9a33]/20 focus-within:border-[#2d9a33]">
              <span className="material-symbols-outlined text-gray-400 text-[20px] mr-2">search</span>
              <input 
                type="text" 
                placeholder="Search Return ID, Order ID..." 
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
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Report
              </button>
              <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">policy</span>
                Return Policy Settings
              </button>
            </div>

            {/* TABS */}
            <div className="bg-white rounded-t-xl border-b-2 border-transparent px-2 flex overflow-x-auto custom-scrollbar space-x-6 text-sm font-medium border-x border-t border-gray-200">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                let badgeClass = 'bg-gray-100 text-gray-600';
                if (isActive) badgeClass = 'bg-[#2d9a33] text-white';
                else if (tab.id === 'pending approval' && tab.count > 0) badgeClass = 'bg-red-100 text-red-600';

                return (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setPage(1); }}
                    className={`py-4 px-2 whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${isActive ? 'border-[#2d9a33] text-[#2d9a33]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                    style={{ marginBottom: '-2px' }}
                  >
                    {tab.label} {tab.count > 0 && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>{tab.count}</span>}
                  </button>
                );
              })}
            </div>

            {/* FILTERS */}
            <div className="bg-white border-x border-b border-gray-200 p-6 flex flex-wrap gap-4 items-end rounded-b-xl shadow-sm mb-6">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-2">Order ID</label>
                <input 
                  type="text" 
                  value={orderIdSearch}
                  onChange={(e) => setOrderIdSearch(e.target.value)}
                  placeholder="e.g. GH-2023-..." 
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-2">Product Info</label>
                <input 
                  type="text" 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search item" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] text-sm"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-2">Buyer Info</label>
                <input 
                  type="text" 
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  placeholder="Name or Email" 
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

            {/* ERROR BANNER */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* RETURNS TABLE */}
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
                        <th className="p-4">RETURN INFO</th>
                        <th className="p-4">REASON</th>
                        <th className="p-4">BUYER</th>
                        <th className="p-4">REFUND STATUS</th>
                        <th className="p-4">STATUS</th>
                        <th className="p-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {returns.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">assignment_return</span>
                              <p className="font-bold text-gray-900 text-lg">No return requests</p>
                              <p className="text-sm mt-1 mb-4">You have no pending returns or refunds.</p>
                            </div>
                          </td>
                        </tr>
                      ) : returns.map((ret) => {
                        const dateObj = new Date(ret.created_at);
                        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        
                        return (
                          <tr key={ret.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-4">
                              <input type="checkbox" className="rounded border-gray-300 text-[#2d9a33] focus:ring-[#2d9a33] cursor-pointer" />
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-900 line-clamp-1">Return #{ret.id}</p>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">Order ID: GH-2023-{ret.order_id?.toString().padStart(5, '0')}</p>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">Requested: {dateStr}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-red-500 text-[16px] mt-0.5">report_problem</span>
                                <p className="text-sm text-gray-800">{ret.reason}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-900">{ret.buyer_name}</p>
                              <p className="text-xs text-gray-500 font-medium">{ret.buyer_email || 'No email'}</p>
                            </td>
                            <td className="p-4">
                              {ret.refund_status === 'none' ? (
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">None</span>
                              ) : ret.refund_status === 'pending' ? (
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">Pending</span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Issued</span>
                              )}
                            </td>
                            <td className="p-4">
                              {ret.status === 'pending' ? (
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">Pending</span>
                              ) : ret.status === 'accepted' ? (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Accepted</span>
                              ) : (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Rejected</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-3">
                                {ret.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleReturnAction(ret.id, 'accept')}
                                      className="text-sm font-bold text-[#2d9a33] hover:underline"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleReturnAction(ret.id, 'reject')}
                                      className="text-sm font-bold text-red-500 hover:underline"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${ret.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {ret.status === 'accepted' ? 'Accepted' : 'Rejected'}
                                  </span>
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
                  <span className="text-gray-500 font-medium">Showing {returns.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, totalReturns)} of {totalReturns.toLocaleString()} returns</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded bg-[#2d9a33] text-white font-bold">{page}</button>
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
    </>
  );
}
