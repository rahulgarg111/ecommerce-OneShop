import apiClient from './client';
import type { Order, PaginatedResponse, ApiResponse, Address } from '../types';

export const ordersApi = {
  checkout: async (data: {
    shippingAddress: Address;
    billingAddress?: Address;
    paymentMethod?: string;
  }) => {
    const response = await apiClient.post<
      ApiResponse<{ order: Order; clientSecret: string; publishableKey: string }>
    >('/orders/checkout', data);
    return response.data;
  },

  getOrders: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Order>>('/orders', { params });
    return response.data;
  },

  getOrderById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<{ order: Order }>>(`/orders/${id}`);
    return response.data;
  },

  cancelOrder: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>(`/orders/${id}/cancel`);
    return response.data;
  },
};
