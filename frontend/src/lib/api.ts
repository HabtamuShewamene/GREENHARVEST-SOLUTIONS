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
    const response = await this.request<{ accessToken: string; refreshToken: string; user: any }>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });
    this.setToken(response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    return response;
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
      method: 'PUT',
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
      url: '/users/profile',
    });
  }

  async updateUserProfile(userData: any) {
    return this.request({
      method: 'PUT',
      url: '/users/profile',
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
}

// Export singleton instance
export const api = new APIClient();
export default api;
