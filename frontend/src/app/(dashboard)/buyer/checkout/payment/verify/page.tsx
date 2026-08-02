'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function VerifyPaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    
    useEffect(() => {
        const verify = async () => {
            const tx_ref = searchParams?.get('tx_ref');
            const order_id = searchParams?.get('order_id');
            
            if (!tx_ref || !order_id) {
                setStatus('failed');
                setErrorMessage('Missing transaction reference or order ID.');
                return;
            }
            
            try {
                const res = await api.verifyChapaPayment(tx_ref, order_id);
                if (res.status === 'success') {
                    setStatus('success');
                    setTimeout(() => {
                        router.push(`/buyer/orders/${order_id}/track`);
                    }, 2000);
                } else {
                    setStatus('failed');
                    setErrorMessage(res.message || 'Payment was not successful.');
                }
            } catch (error: any) {
                console.error("Verification error", error);
                setStatus('failed');
                setErrorMessage(error.response?.data?.message || 'Failed to verify payment with the server.');
            }
        };
        
        verify();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4 font-sans fixed inset-0 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center relative overflow-hidden">
                {/* Decorative header */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#00a859] via-green-400 to-[#b5e32a]"></div>
                
                <h1 className="text-xl font-bold text-gray-900 mb-8 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[#00a859]">verified_user</span>
                    Verifying Payment
                </h1>

                {status === 'verifying' && (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-16 h-16 border-4 border-gray-100 border-t-[#00a859] rounded-full animate-spin mb-6"></div>
                        <p className="text-gray-900 font-bold mb-1">Checking transaction status...</p>
                        <p className="text-xs text-gray-500">Please wait while we confirm your payment securely.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center py-8 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 text-[#00a859] rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-5xl">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Confirmed!</h2>
                        <p className="text-gray-500 mb-6">Your transaction was successful.</p>
                        <p className="text-xs text-gray-400">Redirecting you to order tracking...</p>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-5xl">error</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Verification Failed</h2>
                        <p className="text-gray-500 mb-8">{errorMessage}</p>
                        <button 
                            onClick={() => router.push('/buyer/checkout')}
                            className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-full transition-colors w-full"
                        >
                            Return to Checkout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
