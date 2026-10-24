import { Package, Truck, CheckCircle2, Clock, XCircle, CreditCard, Check } from 'lucide-react';
import type { Order } from '../../types';

export type OrderStage = 'awaiting_payment' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';

/** Same mapping the backend assistant uses (backend/src/services/assistant/shopTools.ts). */
export const getOrderStage = (order: Pick<Order, 'paymentStatus' | 'fulfillmentStatus'>): OrderStage => {
  if (order.fulfillmentStatus === 'cancelled' || order.paymentStatus === 'refunded') return 'cancelled';
  if (order.fulfillmentStatus === 'delivered') return 'delivered';
  if (order.fulfillmentStatus === 'shipped') return 'in_transit';
  if (order.paymentStatus === 'paid') return 'processing';
  return 'awaiting_payment';
};

export const STAGE_STYLES: Record<OrderStage, { label: string; className: string; icon: typeof Package }> = {
  awaiting_payment: { label: 'Awaiting payment', className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: CreditCard },
  processing: { label: 'Processing', className: 'bg-sky-50 text-sky-700 ring-sky-200', icon: Clock },
  in_transit: { label: 'In transit', className: 'bg-primary-50 text-primary-700 ring-primary-200', icon: Truck },
  delivered: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 ring-slate-200', icon: XCircle },
};

export const StatusPill = ({ stage, size = 'sm' }: { stage: OrderStage; size?: 'sm' | 'md' }) => {
  const { label, className, icon: Icon } = STAGE_STYLES[stage];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${className} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {label}
    </span>
  );
};

const STEPS: { stage: OrderStage; label: string }[] = [
  { stage: 'processing', label: 'Order placed' },
  { stage: 'in_transit', label: 'Shipped' },
  { stage: 'delivered', label: 'Delivered' },
];

/** Horizontal placed → shipped → delivered tracker. */
export const OrderTimeline = ({ stage }: { stage: OrderStage }) => {
  if (stage === 'cancelled' || stage === 'awaiting_payment') return null;
  const current = STEPS.findIndex((s) => s.stage === stage);

  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.stage} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  done ? 'bg-primary-600 text-white shadow-glow' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`whitespace-nowrap text-xs font-medium ${done ? 'text-ink' : 'text-ink-muted'}`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 mb-5 h-1 flex-1 rounded-full ${i < current ? 'bg-primary-600' : 'bg-slate-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
};
