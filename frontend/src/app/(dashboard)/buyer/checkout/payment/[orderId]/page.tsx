'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function PaymentGatewayPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.orderId as string;
    
    const [status, setStatus] = useState<'initializing' | 'processing' | 'success' | 'failed'>('initializing');
    const [orderTotal, setOrderTotal] = useState<number>(0);

    useEffect(() => {
        // Mock fetching order details to show total
        const loadOrder = async () => {
            try {
                // In a real app we'd fetch the specific order:
                // const orderRes = await api.getOrderById(orderId);
                // setOrderTotal(orderRes.order.total_amount);
                
                // For this simulation, we'll just wait a sec and pretend we loaded it
                setTimeout(() => {
                    setOrderTotal(450.50); // Mock total
                    setStatus('processing');
                }, 1500);
            } catch (e) {
                console.error(e);
            }
        };
        
        if (orderId) {
            loadOrder();
        }
    }, [orderId]);

    useEffect(() => {
        if (status === 'processing') {
            // Simulate payment processing time
            const timer = setTimeout(async () => {
                try {
                    // Update order status to paid (assuming such an endpoint exists or we mock it)
                    // await api.updateOrderStatus(orderId, 'paid');
                    setStatus('success');
                } catch (e) {
                    setStatus('failed');
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [status, orderId]);

    useEffect(() => {
        if (status === 'success') {
            // Redirect to tracking page after success
            const timer = setTimeout(() => {
                router.push(`/buyer/orders/${orderId}/track`);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [status, router, orderId]);

    return (
        <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4 font-sans fixed inset-0 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center relative overflow-hidden">
                {/* Decorative header */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#00a859] via-green-400 to-[#b5e32a]"></div>
                
                <h1 className="text-xl font-bold text-gray-900 mb-8 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[#00a859]">lock</span>
                    Chapa Payment Gateway
                </h1>

                {status === 'initializing' && (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#00a859] rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Connecting to Chapa...</p>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="flex flex-col items-center py-6">
                        <div className="text-sm text-gray-500 mb-2">Amount to pay</div>
                        <div className="text-4xl font-black text-gray-900 mb-8">ETB {orderTotal.toFixed(2)}</div>
                        
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[#00a859] rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-[#00a859]">payments</span>
                            </div>
                        </div>
                        
                        <p className="text-gray-900 font-bold mb-1">Processing your payment</p>
                        <p className="text-xs text-gray-500">Please do not close this window</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center py-8 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-5xl">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Successful!</h2>
                        <p className="text-gray-500 mb-6">Your order has been confirmed.</p>
                        <p className="text-xs text-gray-400">Redirecting you to order tracking...</p>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-5xl">error</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Failed</h2>
                        <p className="text-gray-500 mb-8">Something went wrong with your transaction.</p>
                        <button 
                            onClick={() => router.push('/buyer/checkout')}
                            className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-full transition-colors w-full"
                        >
                            Try Again
                        </button>
                    </div>
                )}
                
                {/* Simulated Provider logos */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center gap-4 opacity-50">
                    <div className="h-6 w-12 bg-gray-200 rounded"></div>
                    <div className="h-6 w-12 bg-gray-200 rounded"></div>
                    <div className="h-6 w-12 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    );
}
