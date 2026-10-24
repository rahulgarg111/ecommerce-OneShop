import apiClient from './client';
import type { ApiResponse, Category } from '../types';

export const categoriesApi = {
  getCategories: async () => {
    const response = await apiClient.get<ApiResponse<{ categories: Category[] }>>('/categories');
    return response.data;
  },
};
