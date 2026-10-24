import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Sparkles } from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { useAssistant } from '../../context/AssistantContext';
import SmartImage from '../../components/product/SmartImage';
import { getOrderStage, StatusPill } from '../../components/order/OrderStatus';
import type { OrderStage } from '../../components/order/OrderStatus';
import { formatPrice, formatDate } from '../../utils/format';
import type { Order, Product } from '../../types';

const TABS: { key: 'all' | 'active' | OrderStage; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const OrdersPage = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const { open: openAssistant } = useAssistant();

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getOrders({ limit: 50 }),
  });
  const orders: Order[] = data?.data?.orders || [];

  const filtered = orders.filter((o) => {
    const stage = getOrderStage(o);
    if (tab === 'all') return true;
    if (tab === 'active') return stage === 'processing' || stage === 'in_transit' || stage === 'awaiting_payment';
    return stage === tab;
  });

  return (
    <div className="container-custom max-w-4xl py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">My orders</h1>
          <p className="mt-1 text-sm text-ink-muted">Track deliveries, view receipts and manage past purchases.</p>
        </div>
        <button onClick={() => openAssistant('Give me a quick update on my orders')} className="btn-outline self-start">
          <Sparkles className="h-4 w-4 text-primary-600" /> Ask about my orders
        </button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'chip-active' : 'chip'}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Package className="h-14 w-14 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold">{orders.length ? 'No orders here' : 'No orders yet'}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {orders.length ? 'Try a different tab.' : 'When you place an order it will show up here.'}
            </p>
            {!orders.length && (
              <Link to="/products" className="btn-primary mt-6">
                Start shopping
              </Link>
            )}
          </div>
        ) : (
          filtered.map((order) => {
            const stage = getOrderStage(order);
            const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-primary-200 hover:shadow-lift"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">#{order._id.slice(-8).toUpperCase()}</span>
                    <StatusPill stage={stage} size="md" />
                  </div>
                  <span className="text-sm text-ink-muted">Placed {formatDate(order.createdAt)}</span>
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((item, i) => (
                      <SmartImage
                        width={56}
                        key={i}
                        src={(item.product as Product)?.images?.[0]?.url}
                        alt={item.name}
                        className="h-14 w-14 rounded-xl border-2 border-white object-cover"
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{order.items.map((i) => i.name).join(', ')}</p>
                    <p className="text-xs text-ink-muted">
                      {itemCount} item{itemCount === 1 ? '' : 's'}
                      {order.trackingNumber && stage === 'in_transit' && ` · Tracking ${order.trackingNumber}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(order.total)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
