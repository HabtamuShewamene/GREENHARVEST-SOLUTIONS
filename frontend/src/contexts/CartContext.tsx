'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CartItem } from '@/types';

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => Promise<void>;
  cartSubtotal: number;
  deliveryFee: number;
  tax: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const toggleCart = () => setIsCartOpen(prev => !prev);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const refreshCart = async () => {
    try {
      const cartRes = await api.getCart();
      setCart(cartRes.cart || []);
    } catch (e) {
      console.error('Failed to fetch cart', e);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addToCart = async (productId: number, quantity: number = 1) => {
    await api.addToCart(productId.toString(), quantity);
    await refreshCart();
    openCart();
  };

  const updateQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      await api.removeFromCart(cartItemId.toString());
    } else {
      await api.updateCartItem(cartItemId.toString(), newQuantity);
    }
    await refreshCart();
  };

  const clearCart = async () => {
    await api.clearCart();
    await refreshCart();
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + ((Number(item.product_price || item.product?.price || 0)) * item.quantity), 0);
  const deliveryFee = cart.length > 0 ? 50 : 0; // Updated to match checkout flat fee
  const tax = 0; // Keeping tax 0 as it's not in checkout currently, or we can make it 15% VAT later
  const cartTotal = cartSubtotal + deliveryFee + tax;

  return (
    <CartContext.Provider value={{
      cart, isCartOpen, toggleCart, openCart, closeCart,
      addToCart, updateQuantity, refreshCart, clearCart,
      cartSubtotal, deliveryFee, tax, cartTotal
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
