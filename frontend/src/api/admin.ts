import apiClient from './client';
import type { Order, PaginatedResponse, ApiResponse } from '../types';

export const adminApi = {
  getAllOrders: async (params?: {
    page?: number;
    limit?: number;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    search?: string;
  }) => {
    const response = await apiClient.get<PaginatedResponse<Order>>('/admin/orders', { params });
    return response.data;
  },

  updateOrderFulfillment: async (
    id: string,
    data: {
      fulfillmentStatus?: string;
      trackingNumber?: string;
      notes?: string;
    }
  ) => {
    const response = await apiClient.put<ApiResponse<{ order: Order }>>(
      `/admin/orders/${id}/fulfill`,
      data
    );
    return response.data;
  },

  getAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.get<ApiResponse<any>>('/admin/analytics', { params });
    return response.data;
  },
};
