'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

export default function BuyerSettingsPage() {
    const { showSuccess, showError } = useToast();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Profile State
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [bio, setBio] = useState('');
    const [initials, setInitials] = useState('U');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.getUserProfile();
                if (res.user) {
                    setName(res.user.name || '');
                    setEmail(res.user.email || '');
                    setPhone(res.user.phone || '');
                    setAddress(res.user.address || '');
                    setBio(res.user.bio || '');
                    if (res.user.name) {
                        setInitials(res.user.name.charAt(0).toUpperCase());
                    }
                }
            } catch (err: any) {
                console.error("Failed to load profile", err);
                showError("Failed to load your profile details.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [showError]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updateUserProfile({
                name,
                phone,
                address,
                bio
            });
            showSuccess("Profile updated successfully!");
            if (name) {
                setInitials(name.charAt(0).toUpperCase());
            }
        } catch (err: any) {
            console.error("Failed to update profile", err);
            showError(err?.response?.data?.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-10 h-10 border-4 border-[#ff5d00] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12 pt-4">
            
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Account Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your personal information and shipping address.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Left Column: Profile Snapshot Card */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
                        {/* Decorative Top Accent */}
                        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#ff8900] to-[#ff5d00]"></div>
                        
                        <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md z-10 flex items-center justify-center mt-4">
                            <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white text-3xl font-black">
                                {initials}
                            </div>
                        </div>
                        
                        <h2 className="text-xl font-bold text-gray-900 mt-4">{name || 'Your Name'}</h2>
                        <p className="text-xs text-gray-500 font-medium mb-4">{email}</p>

                        <div className="w-full bg-gray-50 rounded-xl p-4 text-left border border-gray-100">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
                                <span className="material-symbols-outlined text-[#286c00] text-[18px]">verified_user</span>
                                Verified Buyer
                            </div>
                            <p className="text-[10px] text-gray-500">Member of GreenHarvest</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Edit Form */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-700">manage_accounts</span>
                                Personal Details
                            </h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Email (Readonly) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">mail</span>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        disabled 
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed focus:outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Your email address cannot be changed here.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Full Name</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">person</span>
                                        <input 
                                            type="text" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your full name"
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#ff5d00] focus:border-transparent transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Phone Number</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">phone_iphone</span>
                                        <input 
                                            type="tel" 
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="e.g. +251 911 234 567"
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#ff5d00] focus:border-transparent transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-gray-700 mb-2">Shipping Address</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 material-symbols-outlined text-gray-400 text-[18px]">home_pin</span>
                                    <textarea 
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Enter your full delivery address (Street, City, Region)"
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#ff5d00] focus:border-transparent transition-all outline-none resize-none"
                                    ></textarea>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">This address will be used by default for your orders at Checkout.</p>
                            </div>

                            {/* Bio */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-gray-700 mb-2">Short Bio (Optional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 material-symbols-outlined text-gray-400 text-[18px]">edit_note</span>
                                    <textarea 
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="A little bit about yourself..."
                                        rows={2}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#ff5d00] focus:border-transparent transition-all outline-none resize-none"
                                    ></textarea>
                                </div>
                            </div>

                        </div>

                        {/* Form Actions */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => router.back()}
                                className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="px-8 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#ff0000] to-[#d60000] hover:from-[#ff1a1a] hover:to-[#e60000] rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                            >
                                {saving ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>

        </div>
    );
}
