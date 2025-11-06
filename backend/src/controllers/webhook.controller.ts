import { Request, Response } from 'express';
import Stripe from 'stripe';
import { asyncHandler } from '../utils/asyncHandler';
import { stripe } from '../utils/stripe';
import { Order } from '../models/Order.model';
import { logger } from '../config/logger';
import { config } from '../config/env';

export const stripeWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err: any) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.orderId;

  if (!orderId) {
    logger.error('No orderId in PaymentIntent metadata');
    return;
  }

  const order = await Order.findById(orderId);

  if (!order) {
    logger.error(`Order ${orderId} not found`);
    return;
  }

  order.paymentStatus = 'paid';
  order.stripeChargeId = paymentIntent.latest_charge as string;
  await order.save();

  logger.info(`Order ${orderId} marked as paid`);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.orderId;

  if (!orderId) {
    logger.error('No orderId in PaymentIntent metadata');
    return;
  }

  const order = await Order.findById(orderId);

  if (!order) {
    logger.error(`Order ${orderId} not found`);
    return;
  }

  order.paymentStatus = 'failed';
  order.fulfillmentStatus = 'cancelled';
  await order.save();

  logger.info(`Order ${orderId} marked as failed`);

  // TODO: Restore stock
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const order = await Order.findOne({ stripeChargeId: charge.id });

  if (!order) {
    logger.error(`Order with charge ${charge.id} not found`);
    return;
  }

  order.paymentStatus = 'refunded';
  await order.save();

  logger.info(`Order ${order._id} marked as refunded`);

  // TODO: Restore stock
}
