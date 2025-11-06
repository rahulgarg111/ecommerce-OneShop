import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrderById(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });

  const order = data?.data?.order;

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-300 h-8 w-64 rounded"></div>
          <div className="bg-gray-300 h-64 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-custom py-8">
        <p>Order not found</p>
      </div>
    );
  }

  const canCancel = order.paymentStatus !== 'paid' && order.fulfillmentStatus === 'processing';

  return (
    <div className="container-custom py-8">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-primary-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Order Details</h1>
            <p className="text-gray-600">Order ID: {order._id}</p>
            <p className="text-sm text-gray-600">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {canCancel && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="btn-danger"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
          <div>
            <h3 className="font-semibold mb-2">Payment Status</h3>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${
              order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
              order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {order.paymentStatus.toUpperCase()}
            </span>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Fulfillment Status</h3>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${
              order.fulfillmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
              order.fulfillmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
              order.fulfillmentStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {order.fulfillmentStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between border-b pb-4 last:border-b-0">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.sku && <p className="text-sm text-gray-600">SKU: {item.sku}</p>}
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{(item.price / 100).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      Total: ₹{((item.price * item.quantity) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary & Address */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{(order.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>₹{(order.shippingCost / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>₹{(order.tax / 100).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary-600">₹{(order.total / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
            <address className="text-sm text-gray-600 not-italic">
              <p className="font-semibold text-gray-900">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-2">Phone: {order.shippingAddress.phone}</p>
            </address>
          </div>

          {order.trackingNumber && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Tracking</h2>
              <p className="text-sm">
                <span className="text-gray-600">Tracking Number:</span>
                <br />
                <span className="font-mono font-semibold">{order.trackingNumber}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
