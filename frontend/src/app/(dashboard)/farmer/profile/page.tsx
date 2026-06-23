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
  image_url?: string;
  bio?: string;
};

export default function FarmerProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [userRes, dashRes] = await Promise.all([
          api.getUserProfile().catch(() => ({ user: null })),
          api.getFarmerDashboard().catch(() => ({})),
        ]);
        
        setUser(userRes.user);
        setDashboardData(dashRes || null);
        
        if (userRes.user) {
          setFormData({
            name: userRes.user.name || '',
            phone: userRes.user.phone || '',
            address: userRes.user.address || '',
            bio: userRes.user.bio || ''
          });
        }
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'GH';

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col font-sans text-gray-800">
      
      {/* Header */}
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/farmer/dashboard" className="flex items-center gap-2 text-[#2d9a33] font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined">agriculture</span>
            GreenHarvest Seller
          </Link>
          <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
          <span className="text-gray-500 font-medium hidden md:block">Profile Settings</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/farmer/dashboard" className="text-sm font-semibold text-gray-600 hover:text-[#2d9a33] transition-colors bg-gray-100 px-4 py-2 rounded-full">
            Back to Dashboard
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2d9a33] to-[#74df41] p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-[#2d9a33] border border-white">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1200px] mx-auto px-6 py-10 gap-8">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col items-center text-center">
            {loading ? (
              <div className="w-28 h-28 rounded-full bg-gray-100 animate-pulse mb-4" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-green-50 border-4 border-[#2d9a33] flex items-center justify-center text-[#2d9a33] font-bold text-4xl mb-4">
                {initials}
              </div>
            )}
            
            {loading ? (
              <div className="h-6 w-32 bg-gray-100 rounded animate-pulse mb-2" />
            ) : (
              <h2 className="text-xl font-bold text-gray-900 mb-1">{user?.name ?? 'Farmer'}</h2>
            )}
            
            <p className="text-sm text-gray-500 mb-4">{user?.email}</p>
            <div className="w-full h-px bg-gray-100 mb-4"></div>
            
            <div className="flex justify-between w-full text-left px-2">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Total Revenue</p>
                <p className="font-bold text-gray-800 text-lg">ETB {Number(dashboardData?.summary?.total_revenue || 0).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-semibold uppercase">Total Orders</p>
                <p className="font-bold text-gray-800 text-lg">{dashboardData?.summary?.total_orders_received || 0}</p>
              </div>
            </div>
          </div>

          <nav className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 flex flex-col gap-1">
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors text-left w-full border-l-4 bg-green-50 text-[#2d9a33] border-[#2d9a33]">
              <span className="material-symbols-outlined text-[20px]">person</span>
              Profile Details
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors text-left w-full border-l-4 text-gray-600 border-transparent hover:bg-gray-50">
              <span className="material-symbols-outlined text-[20px]">store</span>
              Farm Settings
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors text-left w-full border-l-4 text-gray-600 border-transparent hover:bg-gray-50">
              <span className="material-symbols-outlined text-[20px]">payments</span>
              Payout Methods
            </button>
            <hr className="border-gray-100 my-2 mx-4" />
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 border-l-4 border-transparent hover:bg-red-50 transition-colors font-semibold text-sm w-full text-left">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Logout
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Personal Information</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your farm's public details and contact information.</p>
            </div>
            {!loading && (
              <button
                onClick={() => {
                  if (isEditing) {
                    setFormData({
                      name: user?.name || '',
                      phone: user?.phone || '',
                      address: user?.address || '',
                      bio: user?.bio || ''
                    });
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isEditing ? 'close' : 'edit'}
                </span>
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-50 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Farm Name / Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900"
                        placeholder="e.g. Abebe Farms"
                      />
                    ) : (
                      <div className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-medium">
                        {user?.name || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                    <div className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl text-gray-500 font-medium flex items-center justify-between">
                      <span>{user?.email}</span>
                      <span className="material-symbols-outlined text-[16px] text-gray-400">lock</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Email cannot be changed directly.</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900"
                        placeholder="+251 911..."
                      />
                    ) : (
                      <div className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-medium">
                        {user?.phone || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Farm Location / Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900"
                        placeholder="123 Farm Road, Addis Ababa"
                      />
                    ) : (
                      <div className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-medium">
                        {user?.address || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Farm Bio / Description</label>
                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900 resize-none"
                        placeholder="Tell buyers about your farming practices, organic certifications, and history..."
                      />
                    ) : (
                      <div className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-medium min-h-[100px] whitespace-pre-wrap">
                        {user?.bio || 'No bio provided yet.'}
                      </div>
                    )}
                  </div>

                  
                  
                </div>
              </div>
            )}
            
            {/* Save Action */}
            {isEditing && (
              <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 cursor-pointertransition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2d9a33] hover:bg-green-700 cursor-pointer rounded-xl text-white text-sm font-bold transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">save</span>
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
