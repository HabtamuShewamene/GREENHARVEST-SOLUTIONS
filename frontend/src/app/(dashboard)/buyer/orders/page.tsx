'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
  farm_location?: string;
  farmer_id?: number;
}

interface Order {
  id: number;
  buyer_id: number;
  total_price: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  delivery_status: string;
  created_at: string;
  items: OrderItem[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: 'schedule' },
  confirmed:  { label: 'Confirmed',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: 'check_circle' },
  processing: { label: 'Processing', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: 'sync' },
  shipped:    { label: 'Shipped',    color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
  delivered:  { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: 'check_circle' },
  cancelled:  { label: 'Cancelled',  color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: 'cancel' },
  returned:   { label: 'Returned',   color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200',     icon: 'undo' },
};

const getStatusInfo = (status: string) => {
  return statusConfig[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: 'info' };
};

const progressSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const getProgressIndex = (status: string): number => {
  const idx = progressSteps.indexOf(status);
  return idx >= 0 ? idx : -1;
};

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const { showError } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.getOrders();
      setOrders(res.orders || []);
    } catch (err: any) {
      console.error('Failed to load orders', err);
      showError('Failed to load your orders.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.order_status === filterStatus);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-4 w-32 bg-gray-100 rounded mb-3 animate-pulse" />
            <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
          {/* Card Skeletons */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="h-4 w-24 bg-gray-100 rounded" />
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-100 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">

        {/* ── Breadcrumbs ─────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-[#286c00] mb-2 font-medium">
          <Link href="/buyer/dashboard" className="hover:underline">Home</Link>
          <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
          <span className="text-gray-500">My Orders</span>
        </div>

        {/* ── Page Header ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight font-headline-md">My Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Track and manage your purchases</p>
          </div>
          <button
            onClick={() => router.push('/buyer/dashboard')}
            className="flex items-center gap-2 text-sm font-bold text-[#286c00] hover:text-[#1e5200] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Continue Shopping
          </button>
        </div>

        {/* ── Quick Stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Orders', value: orders.length, icon: 'receipt_long', color: 'text-[#286c00]', bgColor: 'bg-[#f6fdf0] border-[#d5edc4]' },
            { label: 'Pending', value: statusCounts['pending'] || 0, icon: 'schedule', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
            { label: 'In Transit', value: (statusCounts['shipped'] || 0) + (statusCounts['processing'] || 0), icon: 'local_shipping', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
            { label: 'Delivered', value: statusCounts['delivered'] || 0, icon: 'check_circle', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bgColor} border rounded-xl p-4 flex items-center gap-3`}>
              <span className={`material-symbols-outlined text-[24px] ${stat.color}`}>{stat.icon}</span>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Tabs ─────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'pending', label: 'Pending' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'processing', label: 'Processing' },
            { key: 'shipped', label: 'Shipped' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.key
                  ? 'bg-[#286c00] text-white shadow-md shadow-[#286c00]/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && statusCounts[tab.key] ? (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                  filterStatus === tab.key ? 'bg-white/20' : 'bg-gray-200/60'
                }`}>
                  {statusCounts[tab.key]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── Orders List ─────────────────────────────────── */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-20 h-20 bg-[#f6fdf0] rounded-3xl flex items-center justify-center mb-6 border border-[#d5edc4]">
              <span className="material-symbols-outlined text-4xl text-[#286c00]">
                {filterStatus === 'all' ? 'shopping_bag' : 'filter_alt'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No orders yet' : `No ${filterStatus} orders`}
            </h3>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
              {filterStatus === 'all'
                ? 'Start shopping to see your orders here.'
                : 'Try a different filter or check back later.'}
            </p>
            {filterStatus === 'all' ? (
              <Link
                href="/buyer/dashboard"
                className="bg-[#286c00] text-white font-bold text-sm px-8 py-3 rounded-lg hover:bg-[#1e5200] transition-colors shadow-md"
              >
                Start Shopping
              </Link>
            ) : (
              <button
                onClick={() => setFilterStatus('all')}
                className="text-[#286c00] font-bold text-sm hover:underline cursor-pointer"
              >
                View All Orders
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.order_status);
              const progressIdx = getProgressIndex(order.order_status);
              const isExpanded = expandedOrder === order.id;
              const isCancelled = order.order_status === 'cancelled' || order.order_status === 'returned';
              const itemCount = order.items?.length || 0;

              return (
                <div
                  key={order.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-[#d5edc4] transition-all duration-200 hover:shadow-sm"
                >
                  {/* Order Header */}
                  <div
                    className="p-5 sm:p-6 cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#f6fdf0] border border-[#d5edc4] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px] text-[#286c00]">receipt_long</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Order #{order.id}</h3>
                          <p className="text-[11px] text-gray-400">
                            {formatDate(order.created_at)} at {formatTime(order.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${statusInfo.bg} ${statusInfo.color}`}>
                          <span className="material-symbols-outlined text-[14px]">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </span>
                        <span className={`material-symbols-outlined text-[20px] text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Item Preview Row */}
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {order.items?.slice(0, 4).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="w-10 h-10 rounded-lg border-2 border-white bg-gray-100 overflow-hidden shadow-sm"
                          >
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🥦</div>
                            )}
                          </div>
                        ))}
                        {itemCount > 4 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center shadow-sm">
                            <span className="text-[10px] font-bold text-gray-500">+{itemCount - 4}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">
                          {order.items?.slice(0, 2).map(i => i.product_name).join(', ')}
                          {itemCount > 2 ? ` and ${itemCount - 2} more` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-[#286c00]">
                          ETB {Number(order.total_amount || order.total_price || 0).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      {/* Progress Tracker */}
                      {!isCancelled && progressIdx >= 0 && (
                        <div className="px-5 sm:px-6 pt-6 pb-2">
                          <div className="flex items-center justify-between relative">
                            {/* Progress Line */}
                            <div className="absolute top-4 left-6 right-6 h-[2px] bg-gray-200" />
                            <div
                              className="absolute top-4 left-6 h-[2px] bg-[#286c00] transition-all duration-500"
                              style={{ width: `calc(${(progressIdx / (progressSteps.length - 1)) * 100}% - 48px)` }}
                            />

                            {progressSteps.map((step, idx) => {
                              const isComplete = idx <= progressIdx;
                              const isCurrent = idx === progressIdx;
                              const stepInfo = getStatusInfo(step);
                              return (
                                <div key={step} className="flex flex-col items-center z-10 relative">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                      isCurrent
                                        ? 'bg-[#286c00] border-[#286c00] text-white shadow-md shadow-[#286c00]/30'
                                        : isComplete
                                        ? 'bg-[#286c00] border-[#286c00] text-white'
                                        : 'bg-white border-gray-200 text-gray-400'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      {isComplete ? 'check' : stepInfo.icon}
                                    </span>
                                  </div>
                                  <span className={`text-[9px] mt-2 font-bold uppercase tracking-wider ${
                                    isCurrent ? 'text-[#286c00]' : isComplete ? 'text-gray-600' : 'text-gray-400'
                                  }`}>
                                    {stepInfo.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Cancelled / Returned Banner */}
                      {isCancelled && (
                        <div className={`mx-5 sm:mx-6 mt-5 p-3 rounded-xl border flex items-center gap-3 ${statusInfo.bg}`}>
                          <span className={`material-symbols-outlined text-[20px] ${statusInfo.color}`}>{statusInfo.icon}</span>
                          <p className={`text-xs font-bold ${statusInfo.color}`}>
                            This order has been {order.order_status}.
                          </p>
                        </div>
                      )}

                      {/* Order Items */}
                      <div className="p-5 sm:p-6 space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order Items</h4>
                        {order.items?.map((item, idx) => (
                          <div key={item.id || idx} className="flex items-center gap-4 bg-white rounded-xl p-3 border border-gray-100">
                            <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-50">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">🥦</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-bold text-gray-900 truncate">{item.product_name}</h5>
                              <p className="text-[11px] text-gray-400">
                                Qty: <span className="font-bold text-gray-600">{item.quantity}</span>
                                <span className="mx-1.5">·</span>
                                ETB {Number(item.price).toFixed(2)} each
                              </p>
                            </div>
                            <p className="text-sm font-bold text-gray-900 shrink-0">
                              ETB {(Number(item.price) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Order Summary Footer */}
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500 font-medium">Payment Status</span>
                            <span className={`text-xs font-bold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                              {order.payment_status?.charAt(0).toUpperCase() + order.payment_status?.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500 font-medium">Delivery Status</span>
                            <span className="text-xs font-bold text-gray-700">
                              {order.delivery_status?.charAt(0).toUpperCase() + order.delivery_status?.slice(1)}
                            </span>
                          </div>
                          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900">Total</span>
                            <span className="text-lg font-bold text-[#286c00]">
                              ETB {Number(order.total_amount || order.total_price || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Link href={`/buyer/orders/${order.id}/track`} className="w-full flex items-center justify-center gap-2 py-3 bg-[#286c00] text-white rounded-xl font-bold hover:bg-[#1e5200] transition-colors shadow-md">
                            <span className="material-symbols-outlined text-[18px]">share_location</span>
                            Track Order Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
