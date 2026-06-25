'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const REGION_COLORS = ['#166534', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];

export default function MarketInsightsPage() {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [regionalDemand, setRegionalDemand] = useState<any[]>([]);
  const [supplyForecast, setSupplyForecast] = useState<any[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [commodityKeys, setCommodityKeys] = useState<string[]>([]);
  const [months, setMonths] = useState(6);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const marketRes = await api.getMarketInsights(months);
      const raw = marketRes.data || {};
      const priceTrends = raw.price_trends || {};

      setTrending(raw.trending || []);
      setRegionalDemand(raw.regional_demand || []);
      setSupplyForecast(raw.supply_forecast || []);
      setMyProducts(raw.my_products_vs_market || []);
      setLastUpdated(raw.last_updated || null);

      const keys = Object.keys(priceTrends);
      setCommodityKeys(keys);

      const formattedData: Record<string, any> = {};
      keys.forEach((commodity) => {
        (priceTrends[commodity] || []).forEach((entry: any) => {
          const dateObj = new Date(entry.date);
          const dateStr = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });
          if (!formattedData[dateStr]) {
            formattedData[dateStr] = { date: dateStr, sortTime: dateObj.getTime() };
          }
          formattedData[dateStr][commodity] = entry.price;
        });
      });

      const sortedData = Object.values(formattedData).sort(
        (a: any, b: any) => a.sortTime - b.sortTime
      );
      setMarketData(sortedData);
    } catch (err) {
      setError('Failed to load market insights. Please try again.');
      console.error('Failed to load market data', err);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    if (trending.length === 0 && myProducts.length === 0) {
      showError('No data available to export.');
      return;
    }

    const lines = [
      'GreenHarvest Market Insights Report',
      `Generated: ${new Date().toLocaleString()}`,
      `Period: Last ${months} months`,
      '',
      '--- Trending Commodities ---',
      'Commodity,Change %,Direction',
      ...trending.map((t) => `${t.name},${t.change_pct}%,${t.up ? 'Up' : 'Down'}`),
      '',
      '--- Regional Demand ---',
      'Region,Demand Index,Avg Price (ETB)',
      ...regionalDemand.map((r) => `${r.region},${r.demand_index},${r.avg_price}`),
      '',
      '--- Your Products vs Market ---',
      'Product,Your Price,Market Price,Diff %',
      ...myProducts.map((p) =>
        `${p.product_name},${p.farmer_price},${p.market_price || 'N/A'},${p.price_diff_pct ?? 'N/A'}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `market-insights-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Report exported successfully.');
  };

  const formattedLastUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const areaColors = ['#16a34a', '#86efac', '#f59e0b', '#3b82f6'];

  if (loading && marketData.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9fafb]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d9a33]" />
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#f8f9fc]">
      <header className="px-8 py-6 flex flex-col gap-1 sticky top-0 bg-[#f8f9fc] z-10 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Market Insights Dashboard</h1>
          <button
            onClick={handleExport}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
          >
            Export Report
          </button>
        </div>
        <p className="text-sm text-gray-500 font-medium tracking-wide">
          Ethiopia Commodity Overview | Last Updated: {formattedLastUpdated}
        </p>
      </header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadData} className="font-bold hover:underline">Retry</button>
          </div>
        )}
        {/* YOUR PRODUCTS VS MARKET */}
        {myProducts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Your Products vs Market</h2>
            <p className="text-sm text-gray-500 mb-6">How your listed prices compare to commodity market averages</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Your Price</th>
                    <th className="pb-3 pr-4">Market Price</th>
                    <th className="pb-3 pr-4">Commodity</th>
                    <th className="pb-3">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {myProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-bold text-gray-900">{p.product_name}</td>
                      <td className="py-3 pr-4">ETB {p.farmer_price?.toLocaleString()}</td>
                      <td className="py-3 pr-4">{p.market_price ? `ETB ${p.market_price.toLocaleString()}` : '—'}</td>
                      <td className="py-3 pr-4 text-gray-500">{p.commodity_name || '—'}</td>
                      <td className="py-3">
                        {p.price_diff_pct != null ? (
                          <span className={`font-bold ${p.price_diff_pct > 0 ? 'text-orange-600' : p.price_diff_pct < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {p.price_diff_pct > 0 ? '+' : ''}{p.price_diff_pct}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/farmer/products" className="inline-block mt-4 text-sm font-bold text-[#2d9a33] hover:underline">
              Adjust product pricing →
            </Link>
          </div>
        )}

        {/* PRICE TRENDS */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Price Trends</h2>
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value, 10))}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={6}>6 months</option>
              <option value={12}>1 year</option>
              <option value={3}>3 months</option>
            </select>
          </div>

          <div className="h-[300px] w-full">
            {marketData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {commodityKeys.map((key, i) => (
                      <linearGradient key={key} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={areaColors[i % areaColors.length]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={areaColors[i % areaColors.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dx={-10} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                    formatter={(value) => [`ETB ${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  {commodityKeys.map((key, i) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={areaColors[i % areaColors.length]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#color-${i})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                No price data available. Run the commodity price migration to populate data.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Regional Demand Index</h2>
            <div className="h-[280px] w-full">
              {regionalDemand.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalDemand} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value, _name, props: any) => [
                        `Index: ${value} | Avg: ETB ${props.payload?.avg_price?.toLocaleString()} | ${props.payload?.status}`,
                        'Demand',
                      ]}
                    />
                    <Bar dataKey="demand_index" radius={[6, 6, 0, 0]}>
                      {regionalDemand.map((_entry, i) => (
                        <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">No regional data available.</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Top Trending Commodities</h2>
            <div className="space-y-3">
              {trending.length > 0 ? trending.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.up ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-bold text-sm ${item.up ? 'text-[#16a34a]' : 'text-red-600'}`}>
                    <span className="material-symbols-outlined text-[16px]">{item.up ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                    {item.up ? '+' : ''}{item.change_pct}%
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-8">No trending data yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* SUPPLY FORECAST */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Supply Forecast</h2>
          <p className="text-sm text-gray-500 mb-6">Yield projections derived from commodity price momentum</p>
          <div className="h-[260px] w-full">
            {supplyForecast.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplyForecast} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="commodity" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [`${value}%`, name === 'current_yield' ? 'Current' : 'Forecast']}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="current_yield" name="Current Yield" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="forecast_yield" name="Forecast Yield" fill="#166534" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No supply forecast data available.</div>
            )}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </main>
  );
}
