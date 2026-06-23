import React from 'react';
import { FarmerProvider } from '@/contexts/FarmerContext';
import FarmerSidebar from '@/components/farmer/FarmerSidebar';

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <FarmerProvider>
      <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden text-gray-900">
        <FarmerSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]">
          {children}
        </div>
      </div>
    </FarmerProvider>
  );
}
