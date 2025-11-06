import apiClient from './client';
import type { Cart, ApiResponse } from '../types';

export const cartApi = {
  getCart: async (sessionId?: string) => {
    const response = await apiClient.get<ApiResponse<{ cart: Cart }>>('/cart', {
      params: { sessionId },
    });
    return response.data;
  },

  addToCart: async (data: {
    productId: string;
    variantSku?: string;
    quantity?: number;
    sessionId?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<{ cart: Cart }>>('/cart', data);
    return response.data;
  },

  updateCartItem: async (itemId: string, quantity: number, sessionId?: string) => {
    const response = await apiClient.put<ApiResponse<{ cart: Cart }>>(`/cart/${itemId}`, {
      quantity,
      sessionId,
    });
    return response.data;
  },

  removeFromCart: async (itemId: string, sessionId?: string) => {
    const response = await apiClient.delete<ApiResponse<{ cart: Cart }>>(`/cart/${itemId}`, {
      params: { sessionId },
    });
    return response.data;
  },

  clearCart: async (sessionId?: string) => {
    const response = await apiClient.delete<ApiResponse<{ cart: Cart }>>('/cart', {
      params: { sessionId },
    });
    return response.data;
  },

  mergeCarts: async (sessionId: string) => {
    const response = await apiClient.post<ApiResponse<{ cart: Cart }>>('/cart/merge', {
      sessionId,
    });
    return response.data;
  },
};
