import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Truck, Sparkles, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '../../api/orders';
import { useAssistant } from '../../context/AssistantContext';
import SmartImage from '../../components/product/SmartImage';
import { getOrderStage, StatusPill, OrderTimeline } from '../../components/order/OrderStatus';
import { formatPrice } from '../../utils/format';
import type { Product } from '../../types';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { open: openAssistant } = useAssistant();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrderById(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to cancel order'),
  });

  const order = data?.data?.order;

  if (isLoading) {
    return (
      <div className="container-custom max-w-5xl space-y-4 py-10">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-40" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-custom py-24 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Link to="/orders" className="btn-primary mt-6">Back to orders</Link>
      </div>
    );
  }

  const stage = getOrderStage(order);
  const canCancel = order.paymentStatus !== 'paid' && order.fulfillmentStatus === 'processing';
  const number = order._id.slice(-8).toUpperCase();

  return (
    <div className="container-custom max-w-5xl py-10">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      {/* Header + tracker */}
      <div className="card mt-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">Order #{number}</h1>
              <StatusPill stage={stage} size="md" />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openAssistant(`What's the status of my order #${number}?`)} className="btn-outline py-2">
              <Sparkles className="h-4 w-4 text-primary-600" /> Ask assistant
            </button>
            {canCancel && (
              <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="btn-danger py-2">
                <XCircle className="h-4 w-4" />
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
          </div>
        </div>

        {(stage === 'processing' || stage === 'in_transit' || stage === 'delivered') && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <OrderTimeline stage={stage} />
            {order.trackingNumber && (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <Truck className="h-4 w-4 text-primary-600" />
                Tracking number <span className="font-mono font-semibold">{order.trackingNumber}</span>
                {order.notes && <span className="text-ink-muted">· {order.notes}</span>}
              </p>
            )}
          </div>
        )}
        {stage === 'awaiting_payment' && (
          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We haven't received payment for this order yet. It will start processing once payment is confirmed.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-bold">Items</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {order.items.map((item, index) => {
              const product = typeof item.product === 'object' ? (item.product as Product) : undefined;
              return (
                <li key={index} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <SmartImage width={64} src={product?.images?.[0]?.url} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    {product?.slug ? (
                      <Link to={`/products/${product.slug}`} className="font-semibold hover:text-primary-700">{item.name}</Link>
                    ) : (
                      <p className="font-semibold">{item.name}</p>
                    )}
                    <p className="text-sm text-ink-muted">
                      Qty {item.quantity} × {formatPrice(item.price)}
                      {item.sku && ` · SKU ${item.sku}`}
                    </p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold">Payment summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{formatPrice(order.subtotal, true)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Delivery</dt><dd>{order.shippingCost ? formatPrice(order.shippingCost, true) : 'Free'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">GST</dt><dd>{formatPrice(order.tax, true)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total, true)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs capitalize text-ink-muted">Payment: {order.paymentStatus}</p>
          </div>

          <div className="card">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="h-4 w-4 text-primary-600" /> Delivery address
            </h2>
            <address className="mt-3 text-sm not-italic leading-relaxed text-ink-soft">
              <p className="font-semibold text-ink">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-2 text-ink-muted">{order.shippingAddress.phone}</p>
            </address>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
