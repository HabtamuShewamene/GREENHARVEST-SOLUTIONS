'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface FarmerContextType {
  user: any;
  dashboardData: any;
  notifications: any[];
  loading: boolean;
  refreshData: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

const FarmerContext = createContext<FarmerContextType>({
  user: null,
  dashboardData: null,
  notifications: [],
  loading: true,
  refreshData: async () => {},
  markNotificationRead: async () => {}
});

export const useFarmerContext = () => useContext(FarmerContext);

export function FarmerProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [dashRes, userRes, notifRes] = await Promise.all([
        api.getFarmerDashboard().catch(() => ({})),
        api.getUserProfile().catch(() => ({ user: null })),
        api.getNotifications().catch(() => ({ notifications: [] }))
      ]);
      
      setDashboardData(dashRes || null);
      setUser(userRes.user || null);
      setNotifications(notifRes.notifications || []);
    } catch (error) {
      console.error("Failed to load farmer context data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Optional: Polling every 60 seconds
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  return (
    <FarmerContext.Provider value={{ user, dashboardData, notifications, loading, refreshData: loadData, markNotificationRead }}>
      {children}
    </FarmerContext.Provider>
  );
}
