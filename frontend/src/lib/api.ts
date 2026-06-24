/**
 * API Client for GreenHarvest Solutions
 * Handles all HTTP requests to the backend API
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.request(config);
    return response.data;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<{ access_token: string; refresh_token?: string; user: any }>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });
    // Backend returns snake_case: access_token
    this.setToken(response.access_token);
    if (response.refresh_token) {
      localStorage.setItem('refreshToken', response.refresh_token);
    }
    return response;
  }

  async verifyEmail(token: string) {
    return this.request({
      method: 'GET',
      url: `/auth/verify-email?token=${token}`,
    });
  }

  async register(userData: any) {
    return this.request({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });
  }

  async logout() {
    this.clearToken();
  }

  async forgotPassword(email: string) {
    return this.request({
      method: 'POST',
      url: '/auth/forgot-password',
      data: { email },
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request({
      method: 'POST',
      url: '/auth/reset-password',
      data: { token, password },
    });
  }

  // Product endpoints
  async getProducts(filters?: any) {
    return this.request<{ products: any[] }>({
      method: 'GET',
      url: '/products',
      params: filters,
    });
  }

  async getProductById(id: string) {
    return this.request<{ product: any }>({
      method: 'GET',
      url: `/products/${id}`,
    });
  }

  async createProduct(productData: any) {
    return this.request({
      method: 'POST',
      url: '/products',
      data: productData,
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request({
      method: 'PUT',
      url: `/products/${id}`,
      data: productData,
    });
  }

  async deleteProduct(id: string) {
    return this.request({
      method: 'DELETE',
      url: `/products/${id}`,
    });
  }

  // Cart endpoints
  async getCart() {
    return this.request<{ cart: any[] }>({
      method: 'GET',
      url: '/cart',
    });
  }

  async addToCart(productId: string, quantity: number) {
    return this.request({
      method: 'POST',
      url: '/cart',
      data: { productId, quantity },
    });
  }

  async updateCartItem(id: string, quantity: number) {
    return this.request({
      method: 'PATCH',
      url: `/cart/${id}`,
      data: { quantity },
    });
  }

  async removeFromCart(id: string) {
    return this.request({
      method: 'DELETE',
      url: `/cart/${id}`,
    });
  }

  // Order endpoints
  async getOrders() {
    return this.request<{ orders: any[] }>({
      method: 'GET',
      url: '/orders',
    });
  }

  async getOrderById(id: string) {
    return this.request<{ order: any }>({
      method: 'GET',
      url: `/orders/${id}`,
    });
  }

  async createOrder(orderData: any) {
    return this.request({
      method: 'POST',
      url: '/orders',
      data: orderData,
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request({
      method: 'PATCH',
      url: `/orders/${id}/status`,
      data: { status },
    });
  }

  // Category endpoints
  async getCategories() {
    return this.request<{ categories: any[] }>({
      method: 'GET',
      url: '/categories',
    });
  }

  async getCategoryById(id: string) {
    return this.request<{ category: any }>({
      method: 'GET',
      url: `/categories/${id}`,
    });
  }

  // User endpoints
  async getUserProfile() {
    return this.request<{ user: any }>({
      method: 'GET',
      url: '/users/me',
    });
  }

  async updateUserProfile(userData: any) {
    return this.request({
      method: 'PUT',
      url: '/users/me',
      data: userData,
    });
  }

  // Review endpoints
  async getProductReviews(productId: string) {
    return this.request<{ reviews: any[] }>({
      method: 'GET',
      url: `/reviews/product/${productId}`,
    });
  }

  async createReview(reviewData: any) {
    return this.request({
      method: 'POST',
      url: '/reviews',
      data: reviewData,
    });
  }

  // Notification endpoints
  async getNotifications() {
    return this.request<{ notifications: any[] }>({
      method: 'GET',
      url: '/notifications',
    });
  }

  async markNotificationAsRead(id: string) {
    return this.request({
      method: 'PATCH',
      url: `/notifications/${id}`,
    });
  }

  // Farmer Dashboard endpoints
  async getFarmerDashboard() {
    return this.request<any>({
      method: 'GET',
      url: '/dashboard/farmer',
    });
  }

  async getFarmerOrders(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    return this.request<{ orders: any[]; pagination: any }>({
      method: 'GET',
      url: '/dashboard/farmer/orders',
      params,
    });
  }

  async getFarmerProducts(params?: { page?: number; limit?: number; search?: string; category?: string; stock_status?: string }) {
    return this.request<{ products: any[]; pagination: any }>({
      method: 'GET',
      url: '/dashboard/farmer/products',
      params,
    });
  }

  async exportFarmerOrdersCSV(params?: { status?: string; search?: string }) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.search) queryParams.set('search', params.search);
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/farmer/orders/export-csv?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders-export-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async exportFarmerProductsCSV() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/farmer/products/export-csv`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products-export-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async batchUpdateProducts(product_ids: string[], action: 'delete' | 'deactivate' | 'reactivate') {
    return this.request<{ message: string; affected: number; product_ids: number[] }>({
      method: 'POST',
      url: '/dashboard/farmer/products/batch',
      data: { product_ids: product_ids.map(Number), action },
    });
  }

  async updateReturnStatus(orderId: string, action: 'approve' | 'reject' | 'refund', rejection_reason?: string) {
    return this.request<{ message: string; order_id: number; new_status: string }>({
      method: 'PATCH',
      url: `/dashboard/farmer/orders/${orderId}/return`,
      data: { action, rejection_reason },
    });
  }

  // Task 5.1 — Returns endpoints
  async getReturns(params?: { page?: number; limit?: number }) {
    return this.request<{ returns: any[]; pagination: any }>({
      method: 'GET',
      url: '/returns',
      params,
    });
  }

  // Task 5.2 — Create return
  async createReturn(data: { order_id: number; reason: string; restock_quantity?: number }) {
    return this.request<{ return: any }>({
      method: 'POST',
      url: '/returns',
      data,
    });
  }

  // Task 5.3 — Update return (accept/reject)
  async updateReturn(id: string | number, action: 'accept' | 'reject') {
    return this.request<{ return: any }>({
      method: 'PATCH',
      url: `/returns/${id}`,
      data: { action },
    });
  }

  // Task 5.4 — Batch update product status
  async batchUpdateProductStatus(product_ids: string[], status: 'active' | 'draft' | 'deactivated') {
    return this.request<{ message: string; affected: number; product_ids: number[] }>({
      method: 'PATCH',
      url: '/products/batch',
      data: { product_ids: product_ids.map(Number), status },
    });
  }

  async updateProductStock(id: string, stock: number) {
    return this.request({
      method: 'PATCH',
      url: `/products/${id}/stock`,
      data: { stock },
    });
  }

  // Campaign endpoints
  async getCampaigns() {
    return this.request<{ campaigns: any[] }>({
      method: 'GET',
      url: '/campaigns',
    });
  }

  async getCampaignStats() {
    return this.request<{ stats: any }>({
      method: 'GET',
      url: '/campaigns/stats',
    });
  }

  async createCampaign(campaignData: any) {
    return this.request({
      method: 'POST',
      url: '/campaigns',
      data: campaignData,
    });
  }

  async updateCampaign(id: string, campaignData: any) {
    return this.request({
      method: 'PUT',
      url: `/campaigns/${id}`,
      data: campaignData,
    });
  }

  async updateCampaignStatus(id: string, status: string) {
    return this.request({
      method: 'PATCH',
      url: `/campaigns/${id}/status`,
      data: { status },
    });
  }

  async deleteCampaign(id: string) {
    return this.request({
      method: 'DELETE',
      url: `/campaigns/${id}`,
    });
  }

  // Store Decoration endpoints
  async getStoreLayout() {
    return this.request<{ layout: any }>({
      method: 'GET',
      url: '/store-layout',
    });
  }

  async updateStoreLayout(layoutData: any) {
    return this.request<{ message: string; layout: any }>({
      method: 'PUT',
      url: '/store-layout',
      data: layoutData,
    });
  }

  // Business Advisor
  async getAdvisorDashboard() {
    return this.request<any>({
      method: 'GET',
      url: '/advisor',
    });
  }
}

// Export singleton instance
export const api = new APIClient();
export default api;
