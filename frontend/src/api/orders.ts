import apiClient from './client';
import type { Order, PaginatedResponse, ApiResponse, Address } from '../types';

type CheckoutResponse = {
  order: Order;
  clientSecret: string;
  publishableKey: string;
  webhookConfigured: boolean;
};

type ConfirmPaymentResponse = {
  order: Order;
  paymentOutcome: 'paid' | 'processing' | 'failed';
};

export const ordersApi = {
  checkout: async (data: {
    shippingAddress: Address;
    billingAddress?: Address;
    paymentMethod?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<CheckoutResponse>>('/orders/checkout', data);
    return response.data;
  },

  confirmPayment: async (id: string) => {
    const response = await apiClient.post<ApiResponse<ConfirmPaymentResponse>>(
      `/orders/${id}/confirm-payment`
    );
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
