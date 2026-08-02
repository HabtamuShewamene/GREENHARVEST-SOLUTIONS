import React from 'react';
import { CartProvider } from '@/contexts/CartContext';
import { CartDrawer } from '@/components/features/CartDrawer';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
