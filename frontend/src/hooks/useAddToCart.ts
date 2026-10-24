import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cartApi } from '../api/cart';
import { getSessionId } from '../utils/sessionId';

interface AddToCartInput {
  productId: string;
  name?: string;
  quantity?: number;
  variantSku?: string;
}

export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity = 1, variantSku }: AddToCartInput) =>
      cartApi.addToCart({ productId, quantity, variantSku, sessionId: getSessionId() }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(variables.name ? `${variables.name} added to cart` : 'Added to cart');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Could not add to cart');
    },
  });
};
