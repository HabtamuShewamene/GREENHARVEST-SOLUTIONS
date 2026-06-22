'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  is_verified: boolean;
  mfa_enabled: boolean;
  role: string;
};

type OrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name: string;
  image_url: string | null;
};

type Order = {
  id: number;
  total_amount: number;
  total_price: number;
  order_status: string;
  payment_status: string;
  delivery_status: string;
  created_at: string;
  items: OrderItem[];
};

type Tab = 'overview' | 'orders';

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'Pending',    classes: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  confirmed: { label: 'Confirmed',  classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  delivered: { label: 'Delivered',  classes: 'bg-[#f6fdf0] text-[#286c00] border border-[#d5edc4]' },
  cancelled: { label: 'Cancelled',  classes: 'bg-[#fff0f2] text-[#ff8296] border border-[#ffd6dd]' },
  shipped:   { label: 'In Transit', classes: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
};

function getStatusBadge(status: string) {
  const cfg = statusConfig[status?.toLowerCase()] ?? { label: status, classes: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function MemberSince({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  return <>{d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</>;
}

export default function BuyerProfilePage() {
  const [user, setUser]       = useState<User | null>(null);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [userRes, ordersRes] = await Promise.all([
          api.getUserProfile().catch(() => ({ user: null })),
          api.getOrders().catch(() => ({ orders: [] })),
        ]);
        setUser(userRes.user);
        if (userRes.user) {
          setFormData({
            name: userRes.user.name || '',
            phone: userRes.user.phone || '',
            address: userRes.user.address || ''
          });
        }
        setOrders(ordersRes.orders || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateUserProfile(formData);
      setUser((prev) => prev ? { ...prev, ...formData } : null);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'GH';
  const latestOrder = orders[0] ?? null;

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col font-[Plus_Jakarta_Sans,sans-serif] text-[#1c1b1b]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#becab3]/30 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/buyer/dashboard" className="flex items-center gap-2 text-[#286c00] font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            GreenHarvest
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-6">
            <Link href="/buyer/dashboard" className="text-sm text-[#3f4a38] hover:text-[#286c00] transition-colors font-medium">Dashboard</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/buyer/dashboard" className="relative p-2 text-[#3f4a38] hover:text-[#286c00] transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>shopping_cart</span>
          </Link>
          <div className="w-9 h-9 rounded-full bg-[#f6fdf0] border-2 border-[#d5edc4] flex items-center justify-center text-[#286c00] font-bold text-sm">
            {initials}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1280px] mx-auto w-full px-4 md:px-6 py-8 gap-8">

        {/* ── Sidebar ── */}
        <aside className="w-full md:w-[280px] shrink-0 flex flex-col gap-5">

          {/* Profile card */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#becab3]/30 flex flex-col items-center text-center">
            {loading ? (
              <div className="w-24 h-24 rounded-full bg-gray-100 animate-pulse mb-4" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#f6fdf0] border-4 border-[#d5edc4] flex items-center justify-center text-[#286c00] font-bold text-3xl mb-4 select-none">
                {initials}
              </div>
            )}
            {loading ? (
              <div className="h-6 w-32 bg-gray-100 rounded animate-pulse mb-2" />
            ) : (
              <h2 className="text-xl font-bold text-[#1c1b1b] mb-1">{user?.name ?? 'Guest'}</h2>
            )}
            <p className="text-sm text-[#3f4a38] mb-3">
              {user?.created_at ? <>Member since <MemberSince dateStr={user.created_at} /></> : '—'}
            </p>
          
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#becab3]/30">
            <p className="text-xs font-bold uppercase tracking-wider text-[#3f4a38] mb-3">Quick Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#f6fdf0] rounded-xl p-3 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f4a38] mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-[#286c00]">{loading ? '—' : orders.length}</p>
              </div>
              <div className="bg-[#f6fdf0] rounded-xl p-3 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f4a38] mb-1">Total Spent</p>
                <p className="text-xl font-bold text-[#286c00]">
                  {loading ? '—' : `$${orders.reduce((s, o) => s + Number(o.total_amount || 0), 0).toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="bg-white rounded-2xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#becab3]/30 flex flex-col gap-1 md:sticky md:top-24">
            {(['overview', 'orders'] as Tab[]).map((t) => {
              const icons: Record<Tab, string> = { overview: 'person', orders: 'shopping_bag' };
              const labels: Record<Tab, string> = { overview: 'Overview', orders: 'My Orders' };
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors text-left w-full border-l-4 ${
                    active
                      ? 'bg-[#f6fdf0] text-[#286c00] border-[#286c00]'
                      : 'text-[#3f4a38] border-transparent hover:bg-gray-50 hover:text-[#1c1b1b]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                    {icons[t]}
                  </span>
                  {labels[t]}
                </button>
              );
            })}
            <hr className="border-[#becab3]/30 my-1 mx-4" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#ba1a1a] border-l-4 border-transparent hover:bg-[#ffdad6] transition-colors font-semibold text-sm w-full text-left"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
              Logout
            </button>
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">

          {/* ─ Tab: Overview ─ */}
          {tab === 'overview' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#1c1b1b]">Personal Information</h1>
                  <p className="text-sm text-[#3f4a38] mt-1">Your account details from GreenHarvest.</p>
                </div>
                {!loading && (
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setFormData({
                          name: user?.name || '',
                          phone: user?.phone || '',
                          address: user?.address || ''
                        });
                        setIsEditing(false);
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#becab3] rounded-xl text-sm font-bold text-[#286c00] hover:bg-[#f6fdf0] transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                      {isEditing ? 'close' : 'edit'}
                    </span>
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                )}
              </div>

              {/* Info card */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#becab3]/30">
                {loading ? (
                  <div className="space-y-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-[#1c1b1b] mb-2">Full Name</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3f4a38] text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>person</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-[#286c00] rounded-xl text-[#1c1b1b] text-sm focus:outline-none focus:ring-2 focus:ring-[#286c00]/20 transition-all"
                            placeholder="Enter your full name"
                          />
                        ) : (
                          <div className="w-full pl-10 pr-4 py-3 bg-[#f6f3f2] border border-[#becab3] rounded-xl text-[#1c1b1b] text-sm">
                            {user?.name || '—'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="flex items-center justify-between text-sm font-bold text-[#1c1b1b] mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3f4a38] text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>mail</span>
                        <div className="w-full pl-10 pr-4 py-3 bg-[#f6f3f2] border border-[#becab3] rounded-xl text-[#1c1b1b] text-sm opacity-70 cursor-not-allowed">
                          {user?.email || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-bold text-[#1c1b1b] mb-2">Phone Number</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3f4a38] text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>phone</span>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-[#286c00] rounded-xl text-[#1c1b1b] text-sm focus:outline-none focus:ring-2 focus:ring-[#286c00]/20 transition-all"
                            placeholder="Enter your phone number"
                          />
                        ) : (
                          <div className="w-full pl-10 pr-4 py-3 bg-[#f6f3f2] border border-[#becab3] rounded-xl text-[#1c1b1b] text-sm">
                            {user?.phone || <span className="text-[#3f4a38]">Not set</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-[#1c1b1b] mb-2">Delivery Address</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-4 text-[#3f4a38] text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>location_on</span>
                        {isEditing ? (
                          <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={3}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-[#286c00] rounded-xl text-[#1c1b1b] text-sm focus:outline-none focus:ring-2 focus:ring-[#286c00]/20 transition-all resize-none"
                            placeholder="Enter your full delivery address"
                          />
                        ) : (
                          <div className="w-full pl-10 pr-4 py-3 bg-[#f6f3f2] border border-[#becab3] rounded-xl text-[#1c1b1b] text-sm min-h-[48px]">
                            {user?.address || <span className="text-[#3f4a38]">No address saved</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <>
                        {/* Member Since */}
                        <div>
                          <label className="block text-sm font-bold text-[#1c1b1b] mb-2">Member Since</label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3f4a38] text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>calendar_today</span>
                            <div className="w-full pl-10 pr-4 py-3 bg-[#f6f3f2] border border-[#becab3] rounded-xl text-[#1c1b1b] text-sm">
                              {user?.created_at ? formatDate(user.created_at) : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Role */}
                        <div>
                          <label className="block text-sm font-bold text-[#1c1b1b] mb-2">Account Type</label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3f4a38] text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>badge</span>
                            <div className="w-full pl-10 pr-4 py-3 bg-[#f6f3f2] border border-[#becab3] rounded-xl text-[#1c1b1b] text-sm capitalize">
                              {user?.role || 'Buyer'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {isEditing && (
                      <div className="md:col-span-2 flex justify-end mt-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="px-6 py-3 bg-[#286c00] text-white rounded-xl text-sm font-bold hover:bg-[#1e5200] cursor-pointer transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Latest order mini-card */}
              {!loading && latestOrder && (
                <div className="bg-white rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#becab3]/30 relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#fae100]/10 rounded-full blur-3xl" />
                  <h3 className="font-bold text-sm text-[#1c1b1b] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#286c00] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                    Latest Order Status
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[#f6f3f2] border border-[#becab3]/50 overflow-hidden shrink-0 flex items-center justify-center">
                      {latestOrder.items[0]?.image_url ? (
                        <img src={latestOrder.items[0].image_url} alt={latestOrder.items[0].product_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🥦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#3f4a38] font-bold uppercase tracking-wider">Order #{latestOrder.id}</p>
                      <p className="text-sm font-bold text-[#1c1b1b] truncate mt-0.5">
                        {latestOrder.items[0]?.product_name ?? 'Order'}
                        {latestOrder.items.length > 1 && <span className="text-[#3f4a38] font-normal"> +{latestOrder.items.length - 1} more</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {getStatusBadge(latestOrder.order_status)}
                        <span className="text-sm font-bold text-[#286c00]">${Number(latestOrder.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setTab('orders')}
                      className="shrink-0 text-xs font-bold text-[#286c00] bg-[#f6fdf0] border border-[#d5edc4] px-3 py-2 rounded-lg hover:bg-[#eaf8e0] transition-colors"
                    >
                      View All
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─ Tab: Orders ─ */}
          {tab === 'orders' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-[#1c1b1b]">My Orders</h1>
                <p className="text-sm text-[#3f4a38] mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-[#becab3]/30" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#becab3]/30 flex flex-col items-center text-center">
                  <span className="material-symbols-outlined text-6xl text-[#286c00] opacity-20 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
                  <p className="text-lg font-bold text-[#1c1b1b] mb-1">No orders yet</p>
                  <p className="text-sm text-[#3f4a38] mb-6">Start shopping to see your orders here.</p>
                  <Link
                    href="/buyer/dashboard"
                    className="px-6 py-3 bg-[#286c00] text-white rounded-xl text-sm font-bold hover:bg-[#1e5200] transition-colors shadow-sm"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#becab3]/30 hover:border-[#d5edc4] hover:shadow-md transition-all">
                      {/* Order header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#3f4a38]">Order #{order.id}</p>
                          <p className="text-xs text-[#3f4a38] mt-0.5">{formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {getStatusBadge(order.order_status)}
                          {order.payment_status && order.payment_status !== order.order_status && getStatusBadge(order.payment_status)}
                        </div>
                      </div>

                      {/* Items row */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex -space-x-2">
                          {order.items.slice(0, 4).map((item, idx) => (
                            <div key={idx} className="w-10 h-10 rounded-lg border-2 border-white bg-[#f6f3f2] overflow-hidden flex items-center justify-center shrink-0">
                              {item.image_url
                                ? <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                : <span className="text-sm">🥦</span>
                              }
                            </div>
                          ))}
                          {order.items.length > 4 && (
                            <div className="w-10 h-10 rounded-lg border-2 border-white bg-[#f6fdf0] flex items-center justify-center text-[10px] font-bold text-[#286c00]">
                              +{order.items.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1c1b1b] truncate">
                            {order.items.map(i => i.product_name).join(', ')}
                          </p>
                          <p className="text-xs text-[#3f4a38]">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="text-base font-bold text-[#286c00] shrink-0">
                          ${Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>

                      {/* Delivery progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#f0eded] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#286c00] rounded-full transition-all duration-500"
                            style={{
                              width:
                                order.order_status === 'delivered' ? '100%' :
                                order.order_status === 'shipped'   ? '66%'  :
                                order.order_status === 'confirmed' ? '33%'  :
                                order.order_status === 'cancelled' ? '0%'   : '10%'
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#3f4a38] capitalize shrink-0">{order.delivery_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile bottom nav spacer */}
      <div className="md:hidden h-16" />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#becab3]/30 flex justify-around items-center h-16 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <Link href="/buyer/dashboard" className="flex flex-col items-center justify-center w-full h-full text-[#3f4a38] hover:text-[#286c00] transition-colors gap-0.5">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 0" }}>home</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/buyer/dashboard" className="flex flex-col items-center justify-center w-full h-full text-[#3f4a38] hover:text-[#286c00] transition-colors gap-0.5">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 0" }}>shopping_cart</span>
          <span className="text-[10px] font-medium">Cart</span>
        </Link>
        <div className="flex flex-col items-center justify-center w-full h-full text-[#286c00] gap-0.5 relative">
          <div className="absolute -top-3 bg-[#286c00] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-[#fcf9f8]">
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          <span className="text-[10px] font-medium mt-6">Profile</span>
        </div>
        <button onClick={() => setTab('orders')} className="flex flex-col items-center justify-center w-full h-full text-[#3f4a38] hover:text-[#286c00] transition-colors gap-0.5">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 0" }}>shopping_bag</span>
          <span className="text-[10px] font-medium">Orders</span>
        </button>
      </nav>
    </div>
  );
}
