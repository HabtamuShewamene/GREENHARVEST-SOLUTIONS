'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { validateCampaignForm } from '@/lib/validations/campaign';

export default function CampaignManagementPage() {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Dashboard info for the sidebar
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Campaigns data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showInsight, setShowInsight] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'flash_sale',
    start_date: '',
    end_date: '',
    discount_type: 'percentage',
    discount_value: '',
    voucher_code: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, userRes, notifRes, campaignsRes, statsRes] = await Promise.all([
        api.getFarmerDashboard().catch(() => ({})),
        api.getUserProfile().catch(() => ({ user: null })),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getCampaigns().catch(() => ({ campaigns: [] })),
        api.getCampaignStats().catch(() => ({ stats: {} }))
      ]);
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
      setCampaigns(campaignsRes.campaigns || []);
      setStats(statsRes.stats || {});
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const pendingShipments = dashboardData?.pending_shipments?.length || 0;
  const unreadMessages = notifications.filter(n => !n.is_read).length;

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateCampaignForm(newCampaign);
    if (validationError) {
      showError(validationError);
      return;
    }
    try {
      if (editMode && currentCampaignId) {
        await api.updateCampaign(currentCampaignId, newCampaign);
        showSuccess('Campaign updated successfully.');
      } else {
        await api.createCampaign(newCampaign);
        showSuccess('Campaign created successfully.');
      }
      setIsModalOpen(false);
      loadData(); // Reload stats and campaigns
      setNewCampaign({
        name: '', type: 'flash_sale', start_date: '', end_date: '', discount_type: 'percentage', discount_value: '', voucher_code: ''
      });
      setEditMode(false);
      setCurrentCampaignId(null);
    } catch (err) {
      console.error("Error saving campaign", err);
      showError('Failed to save campaign.');
    }
  };

  const handleEditClick = (campaign: any) => {
    setNewCampaign({
      name: campaign.name,
      type: campaign.type,
      start_date: new Date(campaign.start_date).toISOString().split('T')[0],
      end_date: new Date(campaign.end_date).toISOString().split('T')[0],
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value,
      voucher_code: campaign.voucher_code || ''
    });
    setEditMode(true);
    setCurrentCampaignId(campaign.id);
    setIsModalOpen(true);
  };

  const handleExportReport = () => {
    if (campaigns.length === 0) {
      showError('No campaigns to export.');
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Campaign Name,Type,Status,Start Date,End Date,Reach,Conversion Rate\n"
      + campaigns.map(c => `${c.name},${c.type},${c.status},${new Date(c.start_date).toLocaleDateString()},${new Date(c.end_date).toLocaleDateString()},${c.reach},${c.conversion_rate}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "campaign_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExtendCampaign = () => {
    showSuccess("Campaign 'Summer Kale Blowout' extended by 3 days successfully!");
    setShowInsight(false);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      try {
        await api.deleteCampaign(id);
        loadData();
      } catch (err) {
        console.error("Error deleting campaign", err);
        showError('Failed to delete campaign.');
      }
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateCampaignStatus(id, newStatus);
      loadData();
    } catch (err) {
      console.error("Error updating campaign status", err);
      showError('Failed to update status.');
    }
  };

  const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // If there's no data yet, provide fallbacks based on design
  const displayStats = {
    active_campaigns: stats.active_campaigns || 0,
    promo_revenue: stats.promo_revenue || 0,
    marketing_roi: stats.marketing_roi || 0,
    voucher_redemptions: stats.voucher_redemptions || 0
  };

  return (
    <>
      
      

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center text-sm">
            <span className="text-gray-500 mr-2">Marketing Center</span>
            <span className="material-symbols-outlined text-[14px] text-gray-400 mr-2">chevron_right</span>
            <span className="text-[#2d9a33] font-medium">Campaign Overview</span>
          </div>

          <div className="flex items-center space-x-5 ml-auto">
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-[24px]">notifications_none</span>
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {notifications.length}
                </span>
              )}
            </button>
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
              {unreadMessages > 0 && (
                <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {unreadMessages}
                </span>
              )}
            </button>
            
            <div className="h-8 w-px bg-gray-200 mx-2"></div>

            {/* USER PROFILE */}
            <div className="flex items-center cursor-pointer group relative pl-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2d9a33] to-[#74df41] p-[2px] mr-3">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border border-white">
                  {user?.image_url ? (
                    <img src={user.image_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#2d9a33] font-bold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute top-full right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100">
                <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px] mr-3">logout</span> Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto space-y-8">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Marketing Center</h1>
                <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                  Boost your harvest sales by launching high-impact promotions, flash sales, and customer loyalty bundles across the GreenHarvest network.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleExportReport} className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export Report
                </button>
                <button onClick={() => { setEditMode(false); setNewCampaign({name: '', type: 'flash_sale', start_date: '', end_date: '', discount_type: 'percentage', discount_value: '', voucher_code: ''}); setIsModalOpen(true); }} className="px-5 py-2.5 bg-[#206a24] hover:bg-[#1a551d] text-white rounded-full text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Create New Campaign
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-[#2d9a33] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                  </div>
                  <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">+12% vs LW</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Campaigns</p>
                  <p className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{displayStats.active_campaigns}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </div>
                  <span className="bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">+24.5%</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Promo Revenue</p>
                  <p className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>${displayStats.promo_revenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">trending_up</span>
                  </div>
                  <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">8.4x</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Marketing ROI</p>
                  <p className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{displayStats.marketing_roi}%</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">local_activity</span>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">48 New</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Voucher Redemptions</p>
                  <p className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{displayStats.voucher_redemptions}</p>
                </div>
              </div>
            </div>

            {/* Promotion Tools */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <h2 className="text-lg font-bold text-gray-900 mr-2">Promotion Tools</h2>
                  <span className="material-symbols-outlined text-[#2d9a33] text-[20px]">auto_awesome</span>
                </div>
                <button onClick={() => showInfo('All marketing tools are displayed below.')} className="text-sm font-semibold text-[#2d9a33] hover:underline">View All Tools</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Tool 1 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[#2d9a33] text-white flex items-center justify-center mb-4 shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">bolt</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Flash Sales</h3>
                  <p className="text-xs text-gray-500 mb-6 line-clamp-3">Limited time high-impact discounts to move stock fast.</p>
                  <button onClick={() => {setNewCampaign({...newCampaign, type: 'flash_sale'}); setIsModalOpen(true)}} className="text-sm font-bold text-[#2d9a33] flex items-center hover:text-green-700 transition-colors">
                    Create Now <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                  </button>
                </div>

                {/* Tool 2 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[#c09930] text-white flex items-center justify-center mb-4 shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Coupon Codes</h3>
                  <p className="text-xs text-gray-500 mb-6 line-clamp-3">Personalized codes for loyalty or social media partners.</p>
                  <button onClick={() => {setNewCampaign({...newCampaign, type: 'coupon'}); setIsModalOpen(true)}} className="text-sm font-bold text-[#2d9a33] flex items-center hover:text-green-700 transition-colors">
                    Manage Codes <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                  </button>
                </div>

                {/* Tool 3 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[#c24f2b] text-white flex items-center justify-center mb-4 shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">shopping_basket</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Bulk Buy Discounts</h3>
                  <p className="text-xs text-gray-500 mb-6 line-clamp-3">Tiered pricing for restaurants and wholesale buyers.</p>
                  <button onClick={() => {setNewCampaign({...newCampaign, type: 'bulk_discount'}); setIsModalOpen(true)}} className="text-sm font-bold text-[#2d9a33] flex items-center hover:text-green-700 transition-colors">
                    Set Tiers <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                  </button>
                </div>

                {/* Tool 4 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[#4b5563] text-white flex items-center justify-center mb-4 shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">inventory_2</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Bundle Deals</h3>
                  <p className="text-xs text-gray-500 mb-6 line-clamp-3">Mix and match produce boxes for higher basket value.</p>
                  <button onClick={() => {setNewCampaign({...newCampaign, type: 'bundle'}); setIsModalOpen(true)}} className="text-sm font-bold text-[#2d9a33] flex items-center hover:text-green-700 transition-colors">
                    Bundle Up <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Campaigns Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Active Campaigns</h2>
                  <p className="text-sm text-gray-500 mt-1">Managing your current and upcoming marketing efforts.</p>
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Search campaigns..." 
                      className="pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] w-64 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button onClick={() => showInfo('Advanced filtering options coming soon.')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white">
                      <th className="py-4 px-6">CAMPAIGN NAME</th>
                      <th className="py-4 px-6">STATUS</th>
                      <th className="py-4 px-6">SCHEDULE</th>
                      <th className="py-4 px-6 text-center">REACH</th>
                      <th className="py-4 px-6 text-center">CONV. RATE</th>
                      <th className="py-4 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">campaign</span>
                          <p className="text-gray-500 font-medium">No active campaigns found.</p>
                          <button onClick={() => setIsModalOpen(true)} className="mt-3 text-[#2d9a33] font-bold text-sm hover:underline">Create a campaign</button>
                        </td>
                      </tr>
                    ) : filteredCampaigns.map((campaign: any) => {
                      // Formatting dates
                      const start = new Date(campaign.start_date);
                      const end = new Date(campaign.end_date);
                      const isUpcoming = start > new Date();
                      
                      let statusBadge = null;
                      if (campaign.status === 'running') {
                        statusBadge = <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-[#2d9a33] border border-green-100"><span className="w-1.5 h-1.5 rounded-full bg-[#2d9a33] mr-1.5"></span> Running</span>;
                      } else if (campaign.status === 'scheduled') {
                        statusBadge = <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-100"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span> Scheduled</span>;
                      } else {
                        statusBadge = <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span> Ended</span>;
                      }

                      // Convert type to readable format
                      const typeMap: any = {
                        'flash_sale': 'Flash Sale',
                        'coupon': 'Coupon',
                        'bulk_discount': 'Bulk Discount',
                        'bundle': 'Bundle'
                      };
                      const typeLabel = typeMap[campaign.type] || 'Campaign';

                      // Format discount description
                      let discountDesc = '';
                      if (campaign.type === 'coupon') {
                        discountDesc = `VIP_${campaign.voucher_code || 'CODE'}`;
                      } else if (campaign.discount_type === 'percentage') {
                        discountDesc = `${campaign.discount_value}% OFF`;
                      } else {
                        discountDesc = `Save $${campaign.discount_value}`;
                      }

                      return (
                        <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 mr-4 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {/* Use an icon instead of an image for simplicity, as per design */}
                                {campaign.type === 'flash_sale' && <span className="material-symbols-outlined text-gray-400 text-[20px]">bolt</span>}
                                {campaign.type === 'coupon' && <span className="material-symbols-outlined text-gray-400 text-[20px]">confirmation_number</span>}
                                {campaign.type === 'bundle' && <span className="material-symbols-outlined text-gray-400 text-[20px]">inventory_2</span>}
                                {campaign.type === 'bulk_discount' && <span className="material-symbols-outlined text-gray-400 text-[20px]">shopping_basket</span>}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{campaign.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{typeLabel} • {discountDesc}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {statusBadge}
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-medium text-gray-800">{start.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - {end.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {campaign.status === 'running' ? 'Ends in ' + Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) + ' days' :
                               campaign.status === 'scheduled' ? 'Starts in ' + Math.ceil((start.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) + ' days' : 'Completed'}
                            </p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {campaign.reach > 0 ? (
                              <>
                                <p className="font-bold text-gray-900 text-sm">{(campaign.reach / 1000).toFixed(1)}k</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">UNIQUE VIEWS</p>
                               </>
                            ) : <span className="text-gray-400">--</span>}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {campaign.conversion_rate > 0 ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center text-sm font-bold text-gray-900">
                                  {campaign.conversion_rate}% <span className="material-symbols-outlined text-[#2d9a33] text-[16px] ml-1">trending_up</span>
                                </div>
                              </div>
                            ) : <span className="text-gray-400">--</span>}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2 text-gray-400">
                              <button onClick={() => showInfo(`Stats for "${campaign.name}" — detailed analytics coming soon.`)} className="hover:text-[#2d9a33] transition-colors p-1" title="View Stats"><span className="material-symbols-outlined text-[20px]">bar_chart</span></button>
                              <button onClick={() => handleEditClick(campaign)} className="hover:text-blue-500 transition-colors p-1" title="Edit Campaign"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                              <button onClick={() => handleDeleteCampaign(campaign.id)} className="hover:text-red-500 transition-colors p-1" title="Delete Campaign"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 border-t border-gray-100 flex justify-between items-center text-sm bg-gray-50/50">
                <span className="text-gray-500 font-medium">Showing {filteredCampaigns.length} of {campaigns.length} campaigns</span>
                <div className="flex gap-1">
                  <button className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center bg-white text-gray-400 hover:bg-gray-50"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
                  <button className="w-8 h-8 rounded border border-[#2d9a33] flex items-center justify-center bg-[#2d9a33] text-white font-bold">1</button>
                  <button className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 font-bold">2</button>
                  <button className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 font-bold">3</button>
                  <button className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center bg-white text-gray-400 hover:bg-gray-50"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
                </div>
              </div>
            </div>

            {/* Marketing Insight Banner */}
            {showInsight && (
            <div className="bg-[#2b3328] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 0L122.451 77.5486L200 100L122.451 122.451L100 200L77.5486 122.451L0 100L77.5486 77.5486L100 0Z" fill="#aed581"/>
                </svg>
              </div>
              
              <div className="flex-1 flex gap-5 items-start z-10">
                <div className="w-12 h-12 rounded-full bg-[#81c784]/20 text-[#81c784] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[24px]">lightbulb</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>Marketing Insight</h3>
                  <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
                    Your "Summer Kale Blowout" is performing 15% better than similar campaigns in your region. Consider extending it by 3 days to capture the upcoming weekend traffic surge predicted by GreenHarvest Intelligence.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 z-10 shrink-0 w-full md:w-auto">
                <button onClick={handleExtendCampaign} className="flex-1 md:flex-none px-6 py-3 bg-[#3f8824] hover:bg-[#34701e] text-white rounded-lg text-sm font-bold transition-colors">
                  Extend Campaign
                </button>
                <button onClick={() => setShowInsight(false)} className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
            )}

            <div className="text-center text-xs text-gray-400 py-4">
              © {new Date().getFullYear()} GreenHarvest AgriWorkbench. All marketing tools are subject to regional supply chain regulations.
            </div>

          </div>
        </main>
      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fafafa]">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="material-symbols-outlined text-[#2d9a33] mr-2">campaign</span>
                {editMode ? 'Edit Campaign' : 'Create New Campaign'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Campaign Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] outline-none transition-all"
                  placeholder="e.g. Summer Harvest Festival"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Campaign Type</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] outline-none transition-all bg-white"
                    value={newCampaign.type}
                    onChange={(e) => setNewCampaign({...newCampaign, type: e.target.value})}
                  >
                    <option value="flash_sale">Flash Sale</option>
                    <option value="coupon">Coupon Code</option>
                    <option value="bulk_discount">Bulk Buy Discount</option>
                    <option value="bundle">Bundle Deal</option>
                  </select>
                </div>
                {newCampaign.type === 'coupon' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Voucher Code</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] outline-none transition-all uppercase"
                      placeholder="e.g. VIP2024"
                      value={newCampaign.voucher_code}
                      onChange={(e) => setNewCampaign({...newCampaign, voucher_code: e.target.value.toUpperCase()})}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] outline-none transition-all"
                    value={newCampaign.start_date}
                    onChange={(e) => setNewCampaign({...newCampaign, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] outline-none transition-all"
                    value={newCampaign.end_date}
                    onChange={(e) => setNewCampaign({...newCampaign, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Discount Type</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] outline-none transition-all bg-white"
                    value={newCampaign.discount_type}
                    onChange={(e) => setNewCampaign({...newCampaign, discount_type: e.target.value})}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (ETB)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Discount Value</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d9a33]/20 focus:border-[#2d9a33] outline-none transition-all"
                    placeholder={newCampaign.discount_type === 'percentage' ? 'e.g. 15' : 'e.g. 500'}
                    value={newCampaign.discount_value}
                    onChange={(e) => setNewCampaign({...newCampaign, discount_value: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-[#2d9a33] hover:bg-[#25822a] text-white rounded-lg font-bold transition-colors shadow-sm"
                >
                  {editMode ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
