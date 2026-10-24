import Stripe from 'stripe';
import type { IOrder } from '../models/Order.model';
import { restoreOrderStock } from './orderStock';

export type PaymentOutcome = 'paid' | 'processing' | 'failed';

const PROCESSING_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  'processing',
  'requires_action',
  'requires_capture',
  'requires_confirmation',
]);

const FAILURE_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  'canceled',
  'requires_payment_method',
]);

export const reconcileOrderWithPaymentIntent = async (
  order: IOrder,
  paymentIntent: Stripe.PaymentIntent
): Promise<PaymentOutcome> => {
  if (paymentIntent.status === 'succeeded') {
    if (order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.stripeChargeId = (paymentIntent.latest_charge as string) || order.stripeChargeId;
      await order.save();
    }

    return 'paid';
  }

  if (FAILURE_STATUSES.has(paymentIntent.status)) {
    if (!(order.paymentStatus === 'failed' && order.fulfillmentStatus === 'cancelled')) {
      await restoreOrderStock(order._id.toString());
      order.paymentStatus = 'failed';
      order.fulfillmentStatus = 'cancelled';
      await order.save();
    }

    return 'failed';
  }

  if (PROCESSING_STATUSES.has(paymentIntent.status)) {
    return 'processing';
  }

  return 'processing';
};
