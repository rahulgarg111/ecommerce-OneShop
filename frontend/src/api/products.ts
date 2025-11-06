import apiClient from './client';
import type { Product, PaginatedResponse, ApiResponse } from '../types';

interface ProductFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string;
  featured?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

export const productsApi = {
  getProducts: async (filters: ProductFilters = {}) => {
    const response = await apiClient.get<PaginatedResponse<Product>>('/products', {
      params: filters,
    });
    return response.data;
  },

  getProductBySlug: async (slug: string) => {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(
      `/products/slug/${slug}`
    );
    return response.data;
  },

  getProductById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(`/products/${id}`);
    return response.data;
  },

  createProduct: async (data: Partial<Product>) => {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>('/products', data);
    return response.data;
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    const response = await apiClient.put<ApiResponse<{ product: Product }>>(
      `/products/${id}`,
      data
    );
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await apiClient.delete<ApiResponse>(`/products/${id}`);
    return response.data;
  },

  updateStock: async (id: string, stock: number, variantSku?: string) => {
    const response = await apiClient.patch<ApiResponse<{ product: Product }>>(
      `/products/${id}/stock`,
      { stock, variantSku }
    );
    return response.data;
  },
};
