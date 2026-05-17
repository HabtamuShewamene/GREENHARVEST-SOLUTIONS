/**
 * TypeScript Type Definitions for GreenHarvest Solutions
 */

export type UserRole = 'buyer' | 'farmer' | 'admin' | 'delivery' | 'field_agent';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type DeliveryStatus = 'pending' | 'assigned' | 'processing' | 'shipped' | 'out for delivery' | 'delivered' | 'cancelled';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  created_at: string;
  is_verified?: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: number;
  farmer_id: number;
  category_id?: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  farm_location?: string;
  image_url?: string;
  created_at: string;
  farmer?: User;
  category?: Category;
}

export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: number;
  buyer_id: number;
  total_price: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  created_at: string;
  buyer?: User;
  items?: OrderItem[];
}

export interface Payment {
  id: number;
  order_id: number;
  payment_method: string;
  amount: number;
  payment_status: PaymentStatus;
  transaction_id: string;
  created_at: string;
}

export interface Delivery {
  id: number;
  order_id: number;
  delivery_person_id: number;
  delivery_address: string;
  delivery_status: DeliveryStatus;
  estimated_time?: string;
  created_at: string;
  delivery_person?: User;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  user?: User;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProductFilters extends PaginationParams {
  category_id?: number;
  min_price?: number;
  max_price?: number;
  search?: string;
  farmer_id?: number;
}
