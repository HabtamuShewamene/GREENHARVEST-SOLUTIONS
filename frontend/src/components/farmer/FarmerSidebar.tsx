'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFarmerContext } from '@/contexts/FarmerContext';

export default function FarmerSidebar() {
  const pathname = usePathname();
  const { dashboardData } = useFarmerContext();

  const pendingShipments = dashboardData?.pending_shipments?.length || 0;
  const totalOrdersReceived = dashboardData?.summary?.total_orders_received || 0;

  const NavLink = ({ href, icon, label, badge, isActive }: { href: string, icon: string, label: string, badge?: React.ReactNode, isActive?: boolean }) => {
    const active = isActive !== undefined ? isActive : pathname.startsWith(href);
    return (
      <Link href={href} className={`flex items-center px-4 py-2.5 transition-colors ${active ? 'bg-green-50 text-[#2d9a33] border-r-4 border-[#2d9a33]' : 'text-gray-600 hover:bg-gray-50'}`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <span className="material-symbols-outlined mr-3 text-[20px]">{icon}</span>
            <span className={active ? 'font-medium text-sm' : 'text-sm'}>{label}</span>
          </div>
          {badge}
        </div>
      </Link>
    );
  };

  return (
    <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-30">
      <div className="h-16 bg-[#2d9a33] flex items-center px-4 text-white">
        <span className="material-symbols-outlined mr-2">agriculture</span>
        <span className="font-bold text-lg tracking-tight">Seller Center</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
        <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Core</div>
        <NavLink href="/farmer/dashboard" icon="dashboard" label="Overview" isActive={pathname === '/farmer/dashboard'} />

        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Products</div>
        <NavLink href="/farmer/products" icon="inventory_2" label="Manage Products" isActive={pathname === '/farmer/products' || pathname.startsWith('/farmer/products/edit')} />
        <NavLink href="/farmer/products/new" icon="add_box" label="Add New Product" isActive={pathname === '/farmer/products/new'} />

        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</div>
        <NavLink 
          href="/farmer/orders" 
          icon="receipt_long" 
          label="All Orders" 
          badge={<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{totalOrdersReceived}</span>} 
        />
        <NavLink 
          href="/farmer/shipping" 
          icon="local_shipping" 
          label="Shipping" 
          badge={pendingShipments > 0 ? <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{pendingShipments}</span> : undefined} 
        />
        <NavLink href="/farmer/returns" icon="assignment_return" label="Returns & Refunds" />

        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Marketing & Store</div>
        <NavLink href="/farmer/campaigns" icon="campaign" label="Campaigns" />
        <NavLink href="/farmer/store" icon="storefront" label="Store Decoration" />

        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Intelligence</div>
        <NavLink href="/farmer/advisor" icon="bar_chart" label="Business Advisor" />
        <NavLink href="/farmer/market" icon="trending_up" label="Market Insights" />
      </div>

      <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
        GreenHarvest Seller © {new Date().getFullYear()}
      </div>
    </aside>
  );
}
