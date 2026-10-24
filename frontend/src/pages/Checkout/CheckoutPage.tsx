import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { cartApi } from '../../api/cart';
import { ordersApi } from '../../api/orders';
import { getSessionId } from '../../utils/sessionId';
import type { Address } from '../../types';
import toast from 'react-hot-toast';
import StripePaymentForm from '../../components/checkout/StripePaymentForm';

interface CheckoutResponseData {
  order: {
    _id: string;
  };
  clientSecret: string;
  publishableKey: string;
  webhookConfigured: boolean;
}

const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shippingAddress, setShippingAddress] = useState<Address>({
    name: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    phone: '',
  });

  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(getSessionId()),
  });

  const cart = cartData?.data?.cart;
  const items = cart?.items || [];
  const [checkoutData, setCheckoutData] = useState<CheckoutResponseData | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: ordersApi.checkout,
    onSuccess: (response) => {
      if (!response.data?.clientSecret || !response.data?.publishableKey || !response.data?.order) {
        toast.error('Checkout started, but the payment details were incomplete.');
        return;
      }

      setCheckoutData({
        order: response.data.order,
        clientSecret: response.data.clientSecret,
        publishableKey: response.data.publishableKey,
        webhookConfigured: response.data.webhookConfigured,
      });
      toast.success('Order created. Complete your Stripe payment below.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Checkout failed');
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.confirmPayment(orderId),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkoutMutation.mutate({ shippingAddress });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value,
    });
  };

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.priceAtPurchase * item.quantity,
    0
  );

  const shipping = subtotal >= 100000 ? 0 : 5000; // Free shipping over ₹1000
  const tax = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + shipping + tax;
  const stripePromise = useMemo(() => {
    if (!checkoutData?.publishableKey) {
      return null;
    }

    return loadStripe(checkoutData.publishableKey);
  }, [checkoutData?.publishableKey]);

  if (cartLoading) {
    return <div className="container-custom py-8">Loading...</div>;
  }

  if (items.length === 0 && !checkoutData) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shipping Form */}
        <div>
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={shippingAddress.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Street Address *</label>
                <input
                  type="text"
                  name="street"
                  value={shippingAddress.street}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={shippingAddress.city}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={shippingAddress.state}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Postal Code *</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={shippingAddress.postalCode}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country *</label>
                  <input
                    type="text"
                    name="country"
                    value={shippingAddress.country}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={shippingAddress.phone}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={checkoutMutation.isPending || !!checkoutData}
                className="btn-primary w-full"
              >
                {checkoutMutation.isPending
                  ? 'Creating Order...'
                  : checkoutData
                    ? 'Order Created'
                    : 'Continue to Payment'}
              </button>
            </form>
          </div>

          {checkoutData && stripePromise && (
            <div className="card mt-6">
              <h2 className="text-xl font-bold mb-4">Payment</h2>
              <p className="text-sm text-gray-600 mb-4">
                Complete your Stripe test-mode payment to finish order{' '}
                <span className="font-semibold">#{checkoutData.order._id.slice(-8)}</span>.
              </p>

              <div className="mb-4 rounded bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Use Stripe test cards here, for example <strong>4242 4242 4242 4242</strong> with
                any future expiry date and CVC.
              </div>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: checkoutData.clientSecret,
                }}
              >
                <StripePaymentForm
                  onPaymentConfirmed={async () => {
                    const response = await confirmPaymentMutation.mutateAsync(
                      checkoutData.order._id
                    );
                    const outcome = response.data?.paymentOutcome;

                    queryClient.invalidateQueries({ queryKey: ['cart'] });
                    queryClient.invalidateQueries({ queryKey: ['orders'] });
                    queryClient.invalidateQueries({
                      queryKey: ['order', checkoutData.order._id],
                    });

                    if (outcome === 'paid') {
                      toast.success('Payment confirmed. Opening your orders...');
                      setTimeout(() => {
                        navigate('/orders');
                      }, 1200);
                      return;
                    }

                    if (outcome === 'processing') {
                      toast.success(
                        'Payment is processing. You can track the latest status from your order page.'
                      );
                      navigate(`/orders/${checkoutData.order._id}`);
                      return;
                    }

                    toast.error(
                      'Payment was not completed. Your order has been marked as failed.'
                    );
                    navigate(`/orders/${checkoutData.order._id}`);
                  }}
                />
              </Elements>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              {items.map((item: any) => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product?.name} x {item.quantity}
                  </span>
                  <span className="font-semibold">
                    ₹{((item.priceAtPurchase * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">
                  {shipping === 0 ? 'FREE' : `₹${(shipping / 100).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (GST 18%)</span>
                <span className="font-semibold">₹{(tax / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">₹{(total / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Payment mode:</strong> Stripe test mode. Use test card details to complete
                checkout and wait for the order to appear under your account.
              </p>
              {checkoutData && !checkoutData.webhookConfigured && (
                <p className="text-sm text-gray-600 mt-3">
                  Local checkout is using direct Stripe verification because no webhook secret is
                  configured.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
