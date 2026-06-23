import React from 'react';
import Link from 'next/link';

export default function ContactSupport() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/farmer/dashboard" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-[#2d9a33] shadow-sm mr-4 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Contact Support</h1>
            <p className="text-sm text-gray-500 mt-1">We're here to help you grow your business.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900">
                  <option>Order Issue</option>
                  <option>Payment/Payout</option>
                  <option>Technical Problem</option>
                  <option>Account Verification</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                <textarea 
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] transition-all font-medium text-gray-900 resize-none"
                  placeholder="Describe your issue in detail..."
                ></textarea>
              </div>

              <div className="pt-2">
                <button type="button" className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-[#2d9a33] hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-md">
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  Send Message
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-gray-50 p-6 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center text-gray-600">
              <span className="material-symbols-outlined mr-2">call</span>
              <span className="text-sm font-medium">+251 900 123 456 (Mon-Fri, 9AM-5PM)</span>
            </div>
            <div className="flex items-center text-gray-600">
              <span className="material-symbols-outlined mr-2">mail</span>
              <span className="text-sm font-medium">support@greenharvest.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
