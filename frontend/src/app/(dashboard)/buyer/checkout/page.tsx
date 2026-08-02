'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function CheckoutPage() {
    const router = useRouter();
    const { showSuccess, showError } = useToast();
    
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('chapa');

    // Default address fallback
    const defaultAddress = {
        name: "User",
        phone: "Not provided",
        street: "No address provided",
        city: "",
        country: ""
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cartRes, profileRes] = await Promise.all([
                    api.getCart(),
                    api.getUserProfile().catch(() => null)
                ]);
                setCartItems(cartRes.cart || []);
                if (profileRes?.user) {
                    setUserProfile(profileRes.user);
                }
            } catch (err) {
                console.error("Failed to load checkout data", err);
                showError("Failed to load your checkout details. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showError]);

    const handlePlaceOrder = async () => {
        setIsPlacingOrder(true);
        try {
            const orderRes = await api.createOrder({
                // Passing a mock address ID or undefined if not using address management yet
                address_id: undefined 
            });
            const orderId = orderRes.order?.id || orderRes.id;
            if (!orderId) throw new Error("Order ID missing from response");
            
            if (paymentMethod === 'chapa') {
                // Initialize real Chapa payment
                const returnUrl = `${window.location.origin}/buyer/checkout/payment/verify`;
                const chapaRes = await api.initializeChapaPayment(orderId.toString(), returnUrl);
                
                if (chapaRes.checkout_url) {
                    window.location.href = chapaRes.checkout_url;
                } else {
                    throw new Error("Failed to get checkout URL from Chapa");
                }
            } else {
                // Cash on delivery or other
                router.push(`/buyer/orders/${orderId}/track`);
            }
        } catch (err: any) {
            console.error("Failed to place order", err);
            showError(err?.response?.data?.message || "Failed to place order. Please try again.");
            setIsPlacingOrder(false);
        }
    };

    // Computations
    const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.product_price || item.price) * item.quantity), 0);
    const shippingFee = cartItems.length > 0 ? 50 : 0; // Flat 50 ETB shipping for demo
    const total = subtotal + shippingFee;

    // Group items by store (farmer_id)
    const storeGroups = cartItems.reduce((acc, item) => {
        const storeId = item.farmer_id || 'default';
        const storeName = item.farm_location ? `${item.farm_location} Store` : 'GreenHarvest Official Store';
        if (!acc[storeId]) {
            acc[storeId] = { storeName, items: [] };
        }
        acc[storeId].items.push(item);
        return acc;
    }, {} as Record<string, { storeName: string, items: any[] }>);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-10 h-10 border-4 border-[#ff5d00] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">shopping_cart</span>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
                <Link href="/buyer/dashboard" className="bg-gradient-to-r from-[#ff8900] to-[#ff5d00] hover:from-[#ff9900] hover:to-[#ff6d00] text-white font-bold py-3 px-8 rounded-full shadow-md transition-all">
                    Continue Shopping
                </Link>
            </div>
        );
    }

    // Compute address display
    const displayName = userProfile?.name || defaultAddress.name;
    const displayPhone = userProfile?.phone || defaultAddress.phone;
    
    // Attempt to parse city/country if the address is a single string
    const rawAddress = userProfile?.address || defaultAddress.street;
    const displayStreet = rawAddress;
    const displayCity = ""; 
    const displayCountry = userProfile ? "Ethiopia" : "";

    return (
        <div className="bg-[#f2f2f2] min-h-screen pt-6 pb-12 font-sans">
            <div className="max-w-[1200px] mx-auto px-4">
                <div className="mb-6 flex items-center">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Checkout</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 items-start">
                    {/* Left Column - Main Details */}
                    <div className="w-full lg:flex-1 space-y-4">
                        
                        {/* Shipping Address */}
                        <div className="bg-white rounded-xl p-5 shadow-sm relative overflow-hidden">
                            {/* AliExpress style envelope border top */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,#ff5d00,#ff5d00_15px,transparent_15px,transparent_25px,#0b71e6_25px,#0b71e6_40px,transparent_40px,transparent_50px)]"></div>
                            
                            <div className="flex justify-between items-start mb-3 mt-1">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-700 text-lg">location_on</span>
                                    Shipping address
                                </h2>
                                <Link href="/buyer/settings" className="text-sm font-medium text-blue-600 hover:underline">Change</Link>
                            </div>
                            <div className="pl-7">
                                <p className="font-bold text-gray-900 text-sm mb-0.5">{displayName} <span className="font-normal text-gray-500 ml-3">{displayPhone}</span></p>
                                <p className="text-sm text-gray-700">
                                    {displayStreet}
                                    {displayCity && <>, {displayCity}, {displayCountry}</>}
                                </p>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="bg-white rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-700 text-lg">payment</span>
                                    Payment methods
                                </h2>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <label className={`border rounded-lg p-3 cursor-pointer flex items-center gap-3 transition-all ${paymentMethod === 'chapa' ? 'border-[#ff4747] bg-[#ff4747]/5 ring-1 ring-[#ff4747]' : 'border-gray-200 hover:border-[#ff4747]/50'}`}>
                                    <input type="radio" name="payment" value="chapa" checked={paymentMethod === 'chapa'} onChange={() => setPaymentMethod('chapa')} className="text-[#ff4747] focus:ring-[#ff4747] w-4 h-4" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-6 bg-[#00a859] rounded flex items-center justify-center text-white text-[9px] font-black tracking-wider">CHAPA</div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Chapa (Card / Mobile)</p>
                                            <p className="text-xs text-gray-500">Accepts Telebirr, CBE Birr, cards</p>
                                        </div>
                                    </div>
                                </label>
                                <label className={`border rounded-lg p-3 cursor-pointer flex items-center gap-3 transition-all ${paymentMethod === 'cash_on_delivery' ? 'border-[#ff4747] bg-[#ff4747]/5 ring-1 ring-[#ff4747]' : 'border-gray-200 hover:border-[#ff4747]/50'}`}>
                                    <input type="radio" name="payment" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} className="text-[#ff4747] focus:ring-[#ff4747] w-4 h-4" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-6 bg-gray-200 rounded flex items-center justify-center text-gray-700 text-[18px]">
                                            <span className="material-symbols-outlined text-[16px]">money</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Cash on Delivery</p>
                                            <p className="text-xs text-gray-500">Pay when you receive</p>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Order Items (Grouped by Store) */}
                        <div className="space-y-4">
                            {Object.entries(storeGroups).map(([storeId, storeGroup]) => (
                                <div key={storeId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-gray-500 text-sm">storefront</span>
                                        <span className="text-sm font-bold text-gray-900">{storeGroup.storeName}</span>
                                        <span className="material-symbols-outlined text-gray-400 text-sm ml-auto">chevron_right</span>
                                    </div>
                                    
                                    <div className="p-5 space-y-5">
                                        {storeGroup.items.map((item, index) => (
                                            <div key={item.id || index} className="flex gap-4">
                                                <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {item.image_url || item.product?.image_url ? (
                                                        <img src={item.image_url || item.product?.image_url} alt={item.product_name || item.product?.name || item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-gray-300 text-3xl">image</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-between">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div>
                                                            <h3 className="text-sm text-gray-900 hover:text-[#ff4747] transition-colors line-clamp-2 leading-snug">
                                                                {item.product_name || item.product?.name || item.name}
                                                            </h3>
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm font-black text-gray-900">ETB {Number(item.product_price || item.price).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Shipping Option */}
                                                    <div className="mt-3 bg-[#fff8f6] border border-[#ffcfc2] rounded-lg p-2.5 flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-[#ff4747] text-lg">local_shipping</span>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-gray-900">Standard Shipping <span className="float-right text-[#ff4747]">ETB 50.00</span></p>
                                                            <p className="text-[11px] text-gray-600 mt-0.5">Estimated delivery: Tomorrow</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-24">
                        <div className="bg-white rounded-xl shadow-sm">
                            <div className="p-5">
                                <h2 className="text-base font-bold text-gray-900 mb-4">Summary</h2>
                                
                                <div className="space-y-3 text-sm mb-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total item costs</span>
                                        <span className="font-medium text-gray-900">ETB {subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total shipping</span>
                                        <span className="font-medium text-gray-900">ETB {shippingFee.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-5 rounded-b-xl border-t border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-gray-900">Total</span>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-600 mr-1">ETB</span>
                                        <span className="text-2xl font-black text-[#ff4747] leading-none">{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handlePlaceOrder}
                                    disabled={isPlacingOrder}
                                    className="w-full bg-[#ff4747] hover:bg-[#e62e2e] text-white font-bold py-3.5 rounded-full shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isPlacingOrder ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        "Place order"
                                    )}
                                </button>
                                
                                <p className="mt-4 text-[10px] text-gray-500 leading-relaxed text-center">
                                    Upon clicking 'Place order', I confirm I have read and acknowledged all terms and policies.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
