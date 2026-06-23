'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function BusinessAdvisorPage() {
  const [loading, setLoading] = useState(true);
  const [advisorData, setAdvisorData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [realTimeInsights, setRealTimeInsights] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [advRes, dashRes, userRes] = await Promise.all([
        api.getAdvisorDashboard().catch(() => null),
        api.getFarmerDashboard().catch(() => null),
        api.getUserProfile().catch(() => ({ user: null }))
      ]);
      setAdvisorData(advRes || null);
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingShipments = dashboardData?.pending_shipments?.length || 0;

  if (loading && !advisorData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9fafb]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d9a33]"></div>
      </div>
    );
  }

  const perf = advisorData?.performance || {};
  const benchmarks = advisorData?.benchmarks || [];
  const insights = advisorData?.insights || [];
  const aiInsight = advisorData?.ai_insight || {};

  return (
    <>
      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#fcfdfc]">
        
        {/* TOP HEADER */}
        <header className="px-8 py-6 flex items-center justify-between sticky top-0 bg-[#fcfdfc] z-10 border-b border-gray-100">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-black text-[#2d9a33] tracking-tighter" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Business Advisor</h1>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500">Real-time Insights</span>
              <button 
                onClick={() => setRealTimeInsights(!realTimeInsights)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${realTimeInsights ? 'bg-gray-300' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${realTimeInsights ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* TOP METRICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Revenue */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Revenue Performance</h3>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">Last 30D <span className="material-symbols-outlined text-[12px]">trending_up</span></span>
              </div>
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-3xl font-black tracking-tighter text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  ETB {perf.revenue?.toLocaleString() || '142,500'}
                </span>
                <span className="text-xs font-bold text-[#2d9a33] bg-green-50 px-2 py-0.5 rounded">{perf.revenue_growth || '+12.4%'}</span>
              </div>
            </div>

            {/* Efficiency */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Operational Efficiency</h3>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <span className="text-4xl font-black tracking-tighter text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {perf.efficiency || '94.2'}%
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                    <span>SPEED INDEX</span>
                    <span>Avg: {perf.avg_fulfillment_time || '4.2h'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2d9a33] rounded-full" style={{ width: `${perf.efficiency || 94}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Satisfaction */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Satisfaction Rating</h3>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black tracking-tighter text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                    {perf.satisfaction || '4.8'}
                  </span>
                  <div className="flex gap-0.5 text-[#f5c518]">
                    {[1, 2, 3, 4].map(star => <span key={star} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                    <span className="material-symbols-outlined text-[16px]">star_half</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-600">{perf.positive_rating_pct || '96'}% Positive</span>
              </div>
            </div>
          </div>

          {/* MARKET INTELLIGENCE SECTION */}
          <div className="bg-[#fcfdfc] border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#2d9a33] tracking-tighter uppercase" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Market Intelligence</h2>
                <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mt-1">Real-time demand & regional price indexing</p>
              </div>
              <button className="text-xs font-bold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                Addis Ababa Hub
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row">
              {/* Map Placeholder */}
              <div className="flex-1 bg-gradient-to-br from-gray-300 to-gray-400 relative min-h-[400px]">
                {/* Simulated map marker */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse"></div>
                </div>
                {/* Legend */}
                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex gap-4 text-[10px] font-bold text-gray-700 shadow-lg">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-600"></div> High Demand</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-600"></div> Oversaturated</div>
                </div>
              </div>

              {/* Pricing Benchmarks */}
              <div className="w-full lg:w-[350px] bg-[#f9fafb] p-6 flex flex-col justify-between border-l border-gray-200">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-6">Pricing Benchmarks</h3>
                  
                  <div className="space-y-6">
                    {benchmarks.map((item: any) => (
                      <div key={item.id}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-gray-900">{item.product_name}</span>
                          <span className={`text-[10px] font-bold ${item.trend_label === 'Under Market' ? 'text-red-600' : 'text-[#2d9a33]'}`}>{item.trend_label}</span>
                        </div>
                        <div className="flex rounded-md overflow-hidden text-xs font-bold">
                          <div className={`px-3 py-2 flex-1 ${item.trend_label === 'Premium Peak' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            ETB {item.market_avg_price}
                          </div>
                          <div className="px-3 py-2 bg-gray-200 text-gray-500 border-l border-white/50">
                            Avg {(parseFloat(item.market_avg_price) * (item.trend_label === 'Premium Peak' ? 0.95 : 1.1)).toFixed(1)}k
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full mt-8 bg-[#1e6b22] hover:bg-[#165019] text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  OPTIMIZE PRICING
                </button>
              </div>
            </div>
          </div>

          {/* ACTIONABLE INSIGHTS SECTION */}
          <div className="bg-[#fcfdfc] border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-[#2d9a33] tracking-tighter uppercase" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Actionable Insights</h2>
              <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mt-1">Growth opportunities & strategic alerts</p>
            </div>
            
            <div className="flex flex-col lg:flex-row">
              {/* Insights Table */}
              <div className="flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Asset</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Demand</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Supply Gap</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-[#fbfcfb]">
                    {insights.map((insight: any) => (
                      <tr key={insight.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${insight.asset_category === 'HERBS' ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'}`}>
                              <span className="material-symbols-outlined text-[20px]">{insight.asset_category === 'HERBS' ? 'local_florist' : 'psychiatry'}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{insight.asset_name}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{insight.asset_category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`flex items-center gap-1.5 text-xs font-bold ${insight.demand_level === 'EXTREME' ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="material-symbols-outlined text-[16px]">{insight.demand_level === 'EXTREME' ? 'bolt' : 'trending_up'}</span>
                            {insight.demand_level}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1 w-24">
                            <div className={`h-1.5 flex-1 rounded-full ${insight.asset_category === 'HERBS' ? 'bg-red-600' : 'bg-[#e5e7eb]'}`}></div>
                            <div className={`h-1.5 flex-1 rounded-full ${insight.asset_category === 'LEGUMES' ? 'bg-yellow-400' : 'bg-[#e5e7eb]'}`}></div>
                            <div className={`h-1.5 flex-1 rounded-full bg-[#e5e7eb]`}></div>
                            <div className={`h-1.5 flex-1 rounded-full bg-[#e5e7eb]`}></div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="text-[11px] font-bold text-[#2d9a33] hover:underline uppercase tracking-wider">{insight.action_type}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AI Strategic Insight Card */}
              <div className="w-full lg:w-[320px] bg-[#2d2d2d] text-white p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-[#2d9a33]">
                    <span className="material-symbols-outlined">psychology</span>
                    <h3 className="text-[10px] font-bold tracking-widest uppercase">AI Strategic Insight</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300 font-medium">
                    {aiInsight.insight_text ? (
                      <>
                        Regional demand for <strong className="text-[#2d9a33]">{aiInsight.highlight_word}</strong> is up <strong className="text-[#2d9a33]">{aiInsight.highlight_metric}</strong> in Addis Ababa. Consider adjusting harvest timing for maximum ROI.
                      </>
                    ) : (
                      "Analyzing your data to generate actionable growth recommendations..."
                    )}
                  </p>
                </div>
                
                <button className="w-full mt-6 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-white py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors border border-[#4d4d4d]">
                  Execute Strategy
                </button>
              </div>
            </div>
          </div>
          
          <div className="h-8"></div>
        </div>
      </main>
    </>
  );
}
