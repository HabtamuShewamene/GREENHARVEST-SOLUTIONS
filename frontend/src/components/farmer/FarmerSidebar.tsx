'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFarmerContext } from '@/contexts/FarmerContext';

// Add material symbols font if not already loaded, but it seems to be loaded already since it's used.

export default function FarmerSidebar() {
  const pathname = usePathname();
  const { dashboardData } = useFarmerContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const pendingShipments = dashboardData?.pending_shipments?.length || 0;
  const totalOrdersReceived = dashboardData?.summary?.total_orders_received || 0;

  return (
    <div className="py-6 pl-6 h-full flex-shrink-0 z-30">
      <aside className={`${isCollapsed ? 'w-[96px]' : 'w-[260px]'} bg-white rounded-[24px] shadow-sm flex flex-col h-full overflow-hidden transition-all duration-300`}>
       
        {/* Logo */}
        <div className={`flex items-center pb-6 mt-8 ${isCollapsed ? 'px-0 justify-center' : 'px-6'}`}>
          <div className={`w-10 h-10 bg-[#bbf7d0] rounded-xl flex items-center justify-center text-[#16a34a] flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>agriculture</span>
          </div>
          {!isCollapsed && <span className="font-bold text-xl tracking-tight text-gray-900 whitespace-nowrap">Seller Center</span>}
        </div>

        {/* Menu */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar pb-6 ${isCollapsed ? 'px-3' : 'px-4'}`}>
          <div className={`mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${isCollapsed ? 'text-center px-0' : 'px-2'}`}>
            {isCollapsed ? '•••' : 'Main Menu'}
          </div>
          
          <NavItem 
            href="/farmer/dashboard" 
            icon="dashboard" 
            label="Dashboard" 
            isActive={pathname === '/farmer/dashboard'} 
            isCollapsed={isCollapsed}
          />
          
          <NavGroup 
            icon="inventory_2" 
            label="Products"
            activePaths={['/farmer/products', '/farmer/products/new']}
            pathname={pathname}
            isCollapsed={isCollapsed}
            onExpand={() => setIsCollapsed(false)}
          >
            <SubNavItem href="/farmer/products" label="Manage Products" isActive={pathname === '/farmer/products' || pathname.startsWith('/farmer/products/edit')} />
            <SubNavItem href="/farmer/products/new" label="Add New Product" isActive={pathname === '/farmer/products/new'} />
          </NavGroup>

          <NavGroup 
            icon="receipt_long" 
            label="Orders"
            activePaths={['/farmer/orders', '/farmer/shipping', '/farmer/returns']}
            pathname={pathname}
            isCollapsed={isCollapsed}
            onExpand={() => setIsCollapsed(false)}
          >
            <SubNavItem 
              href="/farmer/orders" 
              label="All Orders" 
              isActive={pathname === '/farmer/orders'}
              badge={totalOrdersReceived}
            />
            <SubNavItem 
              href="/farmer/shipping" 
              label="Shipping" 
              isActive={pathname === '/farmer/shipping'}
              badge={pendingShipments > 0 ? pendingShipments : undefined}
            />
            <SubNavItem 
              href="/farmer/returns" 
              label="Returns" 
              isActive={pathname === '/farmer/returns'}
            />
          </NavGroup>

          <NavGroup 
            icon="campaign" 
            label="Marketing"
            activePaths={['/farmer/campaigns', '/farmer/store']}
            pathname={pathname}
            isCollapsed={isCollapsed}
            onExpand={() => setIsCollapsed(false)}
          >
            <SubNavItem href="/farmer/campaigns" label="Campaigns" isActive={pathname === '/farmer/campaigns'} />
            <SubNavItem href="/farmer/store" label="Store Decoration" isActive={pathname === '/farmer/store'} />
          </NavGroup>

          <NavGroup 
            icon="bar_chart" 
            label="Analytics"
            activePaths={['/farmer/advisor', '/farmer/market']}
            pathname={pathname}
            isCollapsed={isCollapsed}
            onExpand={() => setIsCollapsed(false)}
          >
            <SubNavItem href="/farmer/advisor" label="Business Advisor" isActive={pathname === '/farmer/advisor'} />
            <SubNavItem href="/farmer/market" label="Market Insights" isActive={pathname === '/farmer/market'} />
          </NavGroup>

        </div>

        {/* Toggle Button */}
        <div className="mt-auto border-t border-gray-50 p-4 flex justify-center bg-white z-10">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center w-full"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="material-symbols-outlined">
              {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}

function NavItem({ href, icon, label, isActive, isCollapsed }: { href: string, icon: string, label: string, isActive: boolean, isCollapsed: boolean }) {
  return (
    <Link 
      href={href} 
      title={isCollapsed ? label : undefined} 
      className={`flex items-center py-3 mb-1 rounded-xl transition-all relative ${isActive ? 'bg-[#f3f4f6] text-gray-900 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'} ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
    >
      <span className={`material-symbols-outlined text-[22px] flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} ${isActive && isCollapsed ? 'text-gray-900' : ''}`}>{icon}</span>
      {!isCollapsed && <span className="text-sm whitespace-nowrap overflow-hidden">{label}</span>}
      {/* Optional: Add a small active dot when collapsed if needed, but background color handles it */}
    </Link>
  );
}

function NavGroup({ icon, label, children, activePaths, pathname, isCollapsed, onExpand }: { icon: string, label: string, children: React.ReactNode, activePaths: string[], pathname: string, isCollapsed: boolean, onExpand: () => void }) {
  const isChildActive = activePaths.some(path => pathname === path || pathname.startsWith(path + '/'));
  const [isOpen, setIsOpen] = useState(isChildActive);

  const handleClick = () => {
    if (isCollapsed) {
      onExpand();
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="mb-1">
      <button 
        onClick={handleClick}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center py-3 rounded-xl transition-all relative ${isChildActive ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'} ${isCollapsed ? 'justify-center px-0' : 'px-3 justify-between'}`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <span className={`material-symbols-outlined text-[22px] flex-shrink-0 ${isChildActive ? 'text-gray-900' : ''} ${isCollapsed ? '' : 'mr-3'}`}>{icon}</span>
          {!isCollapsed && <span className="text-sm whitespace-nowrap overflow-hidden">{label}</span>}
        </div>
        {!isCollapsed && (
          <span className="material-symbols-outlined text-[18px] transition-transform duration-200 flex-shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
        )}
        {/* If collapsed and active, show background like NavItem. Actually wait, NavItem background is applied to the button itself. Let's add background to button if collapsed and active. */}
        {isCollapsed && isChildActive && (
          <div className="absolute inset-0 bg-[#f3f4f6] rounded-xl -z-10"></div>
        )}
      </button>
      
      {/* Sub items */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen && !isCollapsed ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
        <div className="ml-[22px] pl-4 border-l border-gray-100 flex flex-col gap-1 py-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function SubNavItem({ href, label, badge, isActive }: { href: string, label: string, badge?: React.ReactNode, isActive: boolean }) {
  return (
    <Link href={href} className="group flex items-center justify-between relative">
      <div className="absolute -left-4 top-1/2 w-3 border-t border-gray-100 group-hover:border-gray-200"></div>
      
      <div className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm ${isActive ? 'bg-[#dcfce7] text-[#16a34a] font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
        {badge !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ml-2 ${isActive ? 'bg-white text-[#16a34a]' : 'bg-gray-100 text-gray-500'}`}>
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}
