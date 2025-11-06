import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi } from '../../api/cart';
import { getSessionId } from '../../utils/sessionId';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const CartPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(getSessionId()),
  });

  const cart = data?.data?.cart;
  const items = cart?.items || [];

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateCartItem(itemId, quantity, getSessionId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cart');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => cartApi.removeFromCart(itemId, getSessionId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Item removed from cart');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove item');
    },
  });

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateMutation.mutate({ itemId, quantity: newQuantity });
  };

  const handleRemove = (itemId: string) => {
    removeMutation.mutate(itemId);
  };

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.priceAtPurchase * item.quantity,
    0
  );

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-300 h-8 w-48 rounded"></div>
          <div className="bg-gray-300 h-32 rounded"></div>
          <div className="bg-gray-300 h-32 rounded"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-custom py-16">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 mx-auto mb-4 text-gray-400" />
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
          <Link to="/products" className="btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item: any) => (
            <div key={item._id} className="card flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded flex-shrink-0">
                {item.product?.images?.[0] ? (
                  <img
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  <Link
                    to={`/products/${item.product?.slug}`}
                    className="hover:text-primary-600"
                  >
                    {item.product?.name}
                  </Link>
                </h3>
                {item.variantSku && (
                  <p className="text-sm text-gray-600 mb-2">SKU: {item.variantSku}</p>
                )}
                <p className="text-primary-600 font-bold">
                  ₹{(item.priceAtPurchase / 100).toFixed(2)}
                </p>
              </div>

              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => handleRemove(item._id)}
                  className="text-red-600 hover:text-red-700"
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                    className="btn-secondary px-2 py-1"
                    disabled={item.quantity <= 1 || updateMutation.isPending}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                    className="btn-secondary px-2 py-1"
                    disabled={updateMutation.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="text-sm text-gray-500">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">₹{(subtotal / 100).toFixed(2)}</span>
              </div>
            </div>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/checkout')}
                className="btn-primary w-full"
              >
                Proceed to Checkout
              </button>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Please login to checkout
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary w-full"
                >
                  Login to Checkout
                </button>
              </div>
            )}

            <Link
              to="/products"
              className="block text-center text-primary-600 hover:underline mt-4"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
