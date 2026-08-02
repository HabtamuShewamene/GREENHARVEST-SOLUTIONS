'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function OrderTrackingPage() {
    const params = useParams();
    const router = useRouter();
    const { showSuccess, showError } = useToast();
    const orderId = params?.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!orderId) return;
        const fetchOrder = async () => {
            try {
                // In a real scenario we'd fetch the specific order details by ID
                const res = await api.getOrders();
                const found = res.orders?.find((o: any) => o.id.toString() === orderId);
                if (found) {
                    setOrder(found);
                } else {
                    // Mock order if not found for demo purposes
                    setOrder({
                        id: orderId,
                        status: 'pending',
                        total_amount: 450.50,
                        created_at: new Date().toISOString(),
                        items: [
                            { name: 'Organic Tomatoes', quantity: 2, price: 50 },
                            { name: 'Fresh Basil', quantity: 1, price: 30 }
                        ]
                    });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleCancelOrder = async () => {
        if (!confirm('Are you sure you want to cancel this order?')) return;
        setCancelling(true);
        try {
            // Ideally call a specific endpoint: await api.cancelOrder(orderId);
            // We simulate it here by updating status if the backend supports it:
            // await api.updateOrderStatus(orderId, 'cancelled');
            
            // Mocking success
            setOrder({ ...order, status: 'cancelled' });
            showSuccess('Order cancelled successfully.');
        } catch (err: any) {
            console.error(err);
            showError('Failed to cancel order.');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#286c00] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">Order not found.</p>
                <Link href="/buyer/orders" className="text-[#286c00] hover:underline mt-4 inline-block">Back to Orders</Link>
            </div>
        );
    }

    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    
    // For mapping to steps
    let currentStep = statuses.indexOf(order.status);
    if (order.status === 'cancelled') currentStep = -1;
    if (currentStep === -1 && order.status !== 'cancelled') currentStep = 0; // Fallback

    const canCancel = order.status === 'pending' || order.status === 'confirmed';

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.push('/buyer/orders')} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Track Order #{order.id}</h1>
                    <p className="text-sm text-gray-500">Placed on {new Date(order.created_at || Date.now()).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Tracking & Map */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Simulated Map */}
                    <div className="bg-gray-100 rounded-3xl h-64 w-full relative overflow-hidden border border-gray-200">
                        <img 
                            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop" 
                            alt="Map View" 
                            className="w-full h-full object-cover opacity-60 grayscale-[50%]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent"></div>
                        
                        {/* Map pins simulation */}
                        {order.status !== 'cancelled' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-bounce">
                                <div className="bg-black text-white p-2 rounded-full shadow-xl">
                                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                                </div>
                                <div className="absolute -bottom-2 w-2 h-2 bg-black rotate-45"></div>
                            </div>
                        )}
                        
                        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900">Estimated Delivery</h3>
                                <p className="text-sm text-gray-600">Today, 2:30 PM - 3:00 PM</p>
                            </div>
                            <div className="w-12 h-12 bg-[#f6fdf0] rounded-xl flex items-center justify-center text-[#286c00] border border-[#d5edc4]">
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Order Status</h2>
                        
                        {order.status === 'cancelled' ? (
                            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl text-red-600 border border-red-100">
                                <span className="material-symbols-outlined text-3xl">cancel</span>
                                <div>
                                    <h3 className="font-bold">Order Cancelled</h3>
                                    <p className="text-sm opacity-80">This order has been cancelled and will not be delivered.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative pl-6 space-y-8 before:absolute before:inset-y-2 before:left-3 before:w-0.5 before:bg-gray-100">
                                {statuses.map((s, idx) => {
                                    const isCompleted = currentStep >= idx;
                                    const isCurrent = currentStep === idx;
                                    
                                    const icons: any = {
                                        pending: 'receipt_long',
                                        confirmed: 'check_circle',
                                        processing: 'inventory_2',
                                        shipped: 'local_shipping',
                                        delivered: 'home'
                                    };
                                    const labels: any = {
                                        pending: 'Order Placed',
                                        confirmed: 'Order Confirmed',
                                        processing: 'Preparing your items',
                                        shipped: 'Out for delivery',
                                        delivered: 'Delivered'
                                    };

                                    return (
                                        <div key={s} className="relative">
                                            <div className={`absolute -left-9 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white z-10 transition-colors ${isCompleted ? 'border-[#286c00] text-[#286c00]' : 'border-gray-200 text-gray-300'}`}>
                                                {isCompleted ? (
                                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                                ) : (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                                )}
                                            </div>
                                            <div className={`${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`material-symbols-outlined text-sm ${isCurrent ? 'text-[#ff5d00]' : isCompleted ? 'text-[#286c00]' : 'text-gray-400'}`}>
                                                        {icons[s]}
                                                    </span>
                                                    <h3 className={`font-bold ${isCurrent ? 'text-gray-900 text-base' : 'text-gray-700 text-sm'}`}>{labels[s]}</h3>
                                                </div>
                                                {isCurrent && (
                                                    <p className="text-xs text-gray-500 ml-6">We are currently processing this step.</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Details & Actions */}
                <div className="space-y-6">
                    {/* Delivery Partner */}
                    {currentStep >= 3 && order.status !== 'cancelled' && (
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-sm font-bold text-gray-900 mb-4">Delivery Partner</h2>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                                    <img src="https://ui-avatars.com/api/?name=John+Doe&background=286c00&color=fff" alt="Driver" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900">John Doe</p>
                                    <div className="flex items-center text-xs text-yellow-500">
                                        <span className="material-symbols-outlined text-[14px]">star</span>
                                        <span className="font-bold ml-1 text-gray-700">4.9</span>
                                    </div>
                                </div>
                                <button className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors">
                                    <span className="material-symbols-outlined">call</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Order Summary */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Order Details</h2>
                        <div className="space-y-3 mb-6">
                            {(order.items || []).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{item.quantity}x</span>
                                        <span className="text-gray-700 truncate max-w-[150px]">{item.name || item.product?.name || `Item #${item.product_id}`}</span>
                                    </div>
                                    <span className="font-medium text-gray-900">ETB {((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="text-lg font-black text-[#286c00]">ETB {Number(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    {canCancel && (
                        <button 
                            onClick={handleCancelOrder}
                            disabled={cancelling}
                            className="w-full py-4 rounded-2xl border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {cancelling ? (
                                <span className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">cancel</span>
                                    Cancel Order
                                </>
                            )}
                        </button>
                    )}
                    
                    {!canCancel && order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <p className="text-center text-xs text-gray-500 px-4">
                            This order can no longer be cancelled as it is already being processed. For help, contact support.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
