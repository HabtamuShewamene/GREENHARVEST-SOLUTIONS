'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import EmptyTableState from '@/components/ui/EmptyTableState';
import { useToast } from '@/contexts/ToastContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts';

const REGION_COLORS = ['#166534', '#22c55e', '#4ade80', '#86efac'];

function supplyGapBars(gap: number) {
  const filled = Math.round((gap / 100) * 4);
  return Array.from({ length: 4 }, (_, i) => i < filled);
}

export default function BusinessAdvisorPage() {
  const [loading, setLoading] = useState(true);
  const [advisorData, setAdvisorData] = useState<any>(null);
  const [realTimeInsights, setRealTimeInsights] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { showError } = useToast();

  const loadData = useCallback(async (region?: string) => {
    try {
      setLoading(true);
      setError(null);
      const advRes = await api.getAdvisorDashboard(region || undefined);
      if (!advRes) throw new Error('No data returned');
      setAdvisorData(advRes);
      if (advRes?.selected_region && !region) {
        setSelectedRegion(advRes.selected_region);
      }
    } catch (err) {
      const msg = 'Failed to load advisor data. Please try again.';
      setError(msg);
      showError(msg);
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData(selectedRegion || undefined);
  }, [selectedRegion, loadData]);

  useEffect(() => {
    if (!realTimeInsights) return;
    const interval = setInterval(() => loadData(selectedRegion || undefined), 60000);
    return () => clearInterval(interval);
  }, [realTimeInsights, selectedRegion, loadData]);

  if (loading && !advisorData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9fafb]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d9a33]" />
      </div>
    );
  }

  const perf = advisorData?.performance || {};
  const benchmarks = advisorData?.benchmarks || [];
  const insights = advisorData?.insights || [];
  const aiInsight = advisorData?.ai_insight || {};
  const regionalDemand = advisorData?.regional_demand || [];
  const regions = regionalDemand.map((r: any) => r.region);
  const trending = advisorData?.trending || [];

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: i <= Math.round(rating) ? "'FILL' 1" : "'FILL' 0" }}
        >
          {i <= rating ? 'star' : i - 0.5 <= rating ? 'star_half' : 'star'}
        </span>
      );
    }
    return stars;
  };

  return (
    <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#fcfdfc]">
      <header className="px-8 py-6 flex items-center justify-between sticky top-0 bg-[#fcfdfc] z-10 border-b border-gray-100">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-black text-[#2d9a33] tracking-tighter" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
            Business Advisor
          </h1>
          <div className="h-8 w-px bg-gray-300" />
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500">Real-time Insights</span>
            <button
              onClick={() => setRealTimeInsights(!realTimeInsights)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${realTimeInsights ? 'bg-[#2d9a33]' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${realTimeInsights ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => loadData(selectedRegion || undefined)} className="font-bold hover:underline">Retry</button>
          </div>
        )}
        {/* TOP METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Revenue Performance</h3>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-black tracking-tighter text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                ETB {(perf.revenue || 0).toLocaleString()}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${String(perf.revenue_growth).startsWith('+') ? 'text-[#2d9a33] bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {perf.revenue_growth || '0%'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Last 30 days</p>
          </div>

          <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Operational Efficiency</h3>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-4xl font-black tracking-tighter text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                {perf.efficiency || 0}%
              </span>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                  <span>DELIVERY RATE</span>
                  <span>Avg: {perf.avg_fulfillment_time || '—'}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2d9a33] rounded-full transition-all" style={{ width: `${Math.min(perf.efficiency || 0, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Satisfaction Rating</h3>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black tracking-tighter text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {perf.satisfaction || '—'}
                </span>
                {perf.satisfaction > 0 && (
                  <div className="flex gap-0.5 text-[#f5c518]">{renderStars(perf.satisfaction)}</div>
                )}
              </div>
              <span className="text-xs font-bold text-gray-600">{perf.positive_rating_pct || 0}% Positive</span>
            </div>
          </div>
        </div>

        {trending.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Commodity Price Movement</p>
            <div className="flex flex-wrap gap-3">
              {trending.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-bold text-gray-800">{t.name}</span>
                  <span className={`text-xs font-bold ${t.up ? 'text-green-600' : 'text-red-600'}`}>
                    {t.up ? '+' : ''}{t.change_pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MARKET INTELLIGENCE */}
        <div className="bg-[#fcfdfc] border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#2d9a33] tracking-tighter uppercase" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                Market Intelligence
              </h2>
              <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mt-1">Regional demand from commodity price data</p>
            </div>
            {regions.length > 0 && (
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="text-xs font-bold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9a33]"
              >
                {regions.map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-6 min-h-[320px]">
              {regionalDemand.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={regionalDemand} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`Index: ${value}`, 'Demand']}
                      />
                      <Bar dataKey="demand_index" radius={[6, 6, 0, 0]}>
                        {regionalDemand.map((_entry: any, i: number) => (
                          <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-4 text-[10px] font-bold text-gray-600">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-600" /> High Demand (85+)</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-600" /> Oversaturated (&lt;60)</div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                  No regional demand data available yet.
                </div>
              )}
            </div>

            <div className="w-full lg:w-[350px] bg-[#f9fafb] p-6 flex flex-col justify-between border-l border-gray-200">
              <div>
                <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-6">Pricing Benchmarks</h3>
                {benchmarks.length > 0 ? (
                  <div className="space-y-5">
                    {benchmarks.map((item: any) => (
                      <div key={item.id}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-gray-900">{item.product_name}</span>
                          <span className={`text-[10px] font-bold ${item.trend_label === 'Under Market' ? 'text-red-600' : item.trend_label === 'Over Market' ? 'text-orange-600' : 'text-[#2d9a33]'}`}>
                            {item.trend_label}
                          </span>
                        </div>
                        <div className="flex rounded-md overflow-hidden text-xs font-bold">
                          <div className="px-3 py-2 flex-1 bg-green-100 text-green-800">
                            Yours: ETB {parseFloat(item.farmer_price).toLocaleString()}
                          </div>
                          <div className="px-3 py-2 bg-gray-200 text-gray-600 border-l border-white/50">
                            Market: ETB {parseFloat(item.market_avg_price || 0).toLocaleString()}
                          </div>
                        </div>
                        {item.commodity_name && (
                          <p className="text-[10px] text-gray-400 mt-1">vs {item.commodity_name}</p>
                        )}
                        {item.price_diff_pct !== undefined && item.market_avg_price > 0 && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            {item.price_diff_pct > 0 ? '+' : ''}{item.price_diff_pct}% vs market avg
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Add products to see pricing benchmarks.</p>
                )}
              </div>

              <Link
                href="/farmer/products"
                className="w-full mt-8 bg-[#1e6b22] hover:bg-[#165019] text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                OPTIMIZE PRICING
              </Link>
            </div>
          </div>
        </div>

        {/* ACTIONABLE INSIGHTS */}
        <div className="bg-[#fcfdfc] border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-black text-[#2d9a33] tracking-tighter uppercase" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              Actionable Insights
            </h2>
            <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mt-1">Based on your sales, stock, and market data</p>
          </div>

          <div className="flex flex-col lg:flex-row">
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
                  {insights.length === 0 ? (
                    <EmptyTableState
                      colSpan={4}
                      icon="lightbulb"
                      title="No insights yet"
                      description="Add products and receive orders to generate actionable insights."
                      actionLabel="Add Product"
                      actionHref="/farmer/products/new"
                    />
                  ) : insights.map((insight: any) => {
                    const bars = supplyGapBars(insight.supply_gap_percentage || 0);
                    return (
                      <tr key={insight.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${insight.demand_level === 'EXTREME' ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'}`}>
                              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{insight.asset_name}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{insight.asset_category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`flex items-center gap-1.5 text-xs font-bold ${insight.demand_level === 'EXTREME' || insight.demand_level === 'HIGH' ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="material-symbols-outlined text-[16px]">
                              {insight.demand_level === 'EXTREME' ? 'bolt' : 'trending_up'}
                            </span>
                            {insight.demand_level}
                            <span className="text-gray-400 font-normal ml-1">({insight.units_sold_30d} sold)</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1 w-24">
                            {bars.map((filled, i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full ${filled ? (insight.supply_gap_percentage >= 70 ? 'bg-red-600' : insight.supply_gap_percentage >= 40 ? 'bg-yellow-400' : 'bg-green-500') : 'bg-gray-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-gray-400">{insight.supply_gap_percentage}% gap</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Link href="/farmer/products" className="text-[11px] font-bold text-[#2d9a33] hover:underline uppercase tracking-wider">
                            {insight.action_type}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="w-full lg:w-[320px] bg-[#2d2d2d] text-white p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 text-[#2d9a33]">
                  <span className="material-symbols-outlined">psychology</span>
                  <h3 className="text-[10px] font-bold tracking-widest uppercase">Strategic Insight</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-300 font-medium">
                  {aiInsight.insight_text || 'Analyzing your data to generate recommendations...'}
                </p>
                {aiInsight.highlight_word && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <span className="text-xs bg-[#2d9a33]/20 text-[#2d9a33] px-2 py-1 rounded font-bold">{aiInsight.highlight_word}</span>
                    {aiInsight.highlight_metric && (
                      <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded font-bold">{aiInsight.highlight_metric}</span>
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/farmer/market"
                className="w-full mt-6 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-white py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors border border-[#4d4d4d] text-center"
              >
                View Market Data
              </Link>
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </main>
  );
}
