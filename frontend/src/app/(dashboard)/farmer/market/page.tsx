'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function MarketInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, userRes] = await Promise.all([
        api.getFarmerDashboard().catch(() => null),
        api.getUserProfile().catch(() => ({ user: null }))
      ]);
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingShipments = dashboardData?.pending_shipments?.length || 0;

  if (loading && !dashboardData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9fafb]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d9a33]"></div>
      </div>
    );
  }

  return (
    <>
      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#f8f9fc]">
        
        {/* TOP HEADER */}
        <header className="px-8 py-6 flex flex-col gap-1 sticky top-0 bg-[#f8f9fc] z-10 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Market Insights Dashboard</h1>
            <div className="flex gap-4">
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm">Export Report</button>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium tracking-wide">Ethiopia Commodity Overview | Last Updated: Oct 26, 2026, 11:30 AM</p>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* PRICE TRENDS CHART */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Price Trends</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <div className="w-3 h-3 rounded-full bg-[#16a34a]"></div> Teff (Grade A)
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <div className="w-3 h-3 rounded-full bg-[#86efac]"></div> Coffee (Arabica)
                </div>
                <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option>6 months</option>
                  <option>1 year</option>
                  <option>YTD</option>
                </select>
              </div>
            </div>
            
            {/* Visual mock of a chart */}
            <div className="h-[280px] w-full border-b border-l border-gray-200 relative flex items-end">
              {/* Y Axis labels */}
              <div className="absolute -left-2 bottom-0 w-full h-full flex flex-col justify-between text-xs text-gray-400 -translate-x-full pr-2 text-right">
                <span>2,800</span>
                <span>2,600</span>
                <span>1,400</span>
                <span>1,200</span>
                <span>1,000</span>
                <span>800</span>
              </div>
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-gray-500 tracking-widest">
                ETB/Quintal
              </div>
              
              {/* X Axis labels */}
              <div className="absolute -bottom-8 w-full flex justify-between text-xs text-gray-500 font-medium px-4">
                <span>May '26</span>
                <span>Jun '26</span>
                <span>Jul '26</span>
                <span>Aug '26</span>
                <span>Sep '26</span>
                <span>Oct '26</span>
              </div>

              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-50 pointer-events-none">
                <div className="border-t border-gray-200 w-full"></div>
                <div className="border-t border-gray-200 w-full"></div>
                <div className="border-t border-gray-200 w-full"></div>
                <div className="border-t border-gray-200 w-full"></div>
                <div className="border-t border-gray-200 w-full"></div>
                <div className="border-t border-gray-200 w-full"></div>
              </div>

              {/* Mock SVG Line Chart */}
              <svg className="w-full h-full overflow-visible z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
                {/* Coffee Area */}
                <path d="M0,80 Q10,70 20,80 T40,65 T60,50 T80,40 T100,20 L100,100 L0,100 Z" fill="#86efac" fillOpacity="0.2" />
                <path d="M0,80 Q10,70 20,80 T40,65 T60,50 T80,40 T100,20" fill="none" stroke="#86efac" strokeWidth="2" />
                
                {/* Teff Area */}
                <path d="M0,60 Q15,40 25,50 T45,20 T65,30 T85,25 T100,10 L100,100 L0,100 Z" fill="#16a34a" fillOpacity="0.1" />
                <path d="M0,60 Q15,40 25,50 T45,20 T65,30 T85,25 T100,10" fill="none" stroke="#16a34a" strokeWidth="2.5" />
                
                {/* Tooltip dot */}
                <circle cx="65" cy="30" r="1.5" fill="white" stroke="#16a34a" strokeWidth="0.5" className="animate-pulse" />
              </svg>
              
              {/* Tooltip */}
              <div className="absolute left-[65%] top-[20%] -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl border border-gray-100 z-20 w-48">
                <p className="text-xs font-bold text-gray-500 mb-2">Oct '26</p>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#16a34a]"></div> Teff (Grade A): 1,323
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-[#86efac]"></div> Coffee (Arabica): 788
                </div>
              </div>
            </div>
            <div className="h-8"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* REGIONAL DEMAND HEATMAP */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Regional Demand Heatmap</h2>
                <button className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">more_horiz</span></button>
              </div>
              
              <div className="bg-[#e5f0ea] rounded-xl h-[300px] w-full flex items-center justify-center relative border border-[#cbe1d4]">
                {/* Mock map visualization */}
                <div className="text-center">
                  <span className="material-symbols-outlined text-[64px] text-[#16a34a] opacity-30 mb-2">map</span>
                  <p className="text-sm font-bold text-[#1e6b22]">Ethiopia Hub Regions Map</p>
                  <p className="text-xs text-green-700">Addis Ababa, Dire Dawa, Bahir Dar, Hawassa</p>
                </div>
                
                {/* Mock heatmap legend */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-32 bg-gradient-to-b from-[#166534] via-[#22c55e] to-[#bbf7d0] rounded-full shadow-inner border border-white/50"></div>
              </div>
            </div>

            {/* TOP TRENDING COMMODITIES */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Top Trending Commodities</h2>
                <button className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">more_horiz</span></button>
              </div>
              
              <div className="space-y-5">
                {[
                  { name: 'Teff', icon: 'grass', change: '+12.5%', up: true },
                  { name: 'Coffee', icon: 'coffee', change: '+5.1%', up: true },
                  { name: 'Wheat', icon: 'local_florist', change: '-3.2%', up: false },
                  { name: 'Maize', icon: 'spa', change: '+8.7%', up: true },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.up ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                    </div>
                    <div className={`flex items-center gap-1 font-bold text-sm ${item.up ? 'text-[#16a34a]' : 'text-red-600'}`}>
                      <span className="material-symbols-outlined text-[16px]">{item.up ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                      {item.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WEATHER IMPACT & SUPPLY FORECAST */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Weather Impact & Supply Forecast</h2>
              <button className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">more_horiz</span></button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8">
              {/* Weather Widget */}
              <div className="bg-[#f8f9fc] border border-gray-200 rounded-xl p-5 w-full md:w-auto">
                <h3 className="text-sm font-bold text-gray-900 mb-4">5-Day Weather</h3>
                <div className="flex gap-4 mb-4">
                  {[
                    { day: 'Mon', icon: 'sunny', temp: '24°' },
                    { day: 'Tue', icon: 'rainy', temp: '19°', active: true },
                    { day: 'Wed', icon: 'water_drop', temp: '18°' },
                    { day: 'Thu', icon: 'partly_cloudy_day', temp: '22°' },
                    { day: 'Fri', icon: 'sunny', temp: '25°' },
                  ].map((w, i) => (
                    <div key={i} className={`flex flex-col items-center p-2 rounded-lg ${w.active ? 'bg-white shadow-sm border border-gray-200 text-blue-500' : 'text-gray-500'}`}>
                      <span className="text-xs font-bold mb-2">{w.day}</span>
                      <span className={`material-symbols-outlined text-[24px] ${w.icon === 'sunny' ? 'text-yellow-400' : ''}`}>{w.icon}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#dcfce7] text-[#166534] text-sm font-bold px-4 py-2 rounded-lg inline-block">
                  Expected Harvest: <span className="font-black">High</span>
                </div>
              </div>

              {/* Supply Forecast Bar Chart */}
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 mb-6">Upcoming crop yields for next quarter</h3>
                <div className="flex items-end h-[120px] gap-8 relative border-b border-l border-gray-200 pl-4 pb-2">
                  <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-400 font-bold">
                    <span>100</span>
                    <span>50</span>
                    <span>0</span>
                  </div>
                  
                  {[
                    { label: 'Teff', val1: 85, val2: 95, status: 'High' },
                    { label: 'Coffee', val1: 45, val2: 50, status: 'Moderate' },
                    { label: 'Wheat', val1: 70, val2: 65, status: 'Moderate' },
                    { label: 'Maize', val1: 60, val2: 75, status: 'Moderate' },
                    { label: 'Teff', val1: 80, val2: 90, status: 'High' },
                  ].map((bar, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 group flex-1">
                      <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 whitespace-nowrap">{bar.status}</span>
                      <div className="flex items-end gap-1 w-full justify-center h-full">
                        <div className="w-full max-w-[20px] bg-[#22c55e] rounded-t-sm hover:opacity-80 transition-opacity" style={{ height: `${bar.val1}%` }}></div>
                        <div className="w-full max-w-[20px] bg-[#166534] rounded-t-sm hover:opacity-80 transition-opacity" style={{ height: `${bar.val2}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 absolute -bottom-6">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-8"></div>
        </div>
      </main>
    </>
  );
}
