import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';
import { Order } from '../models/Order.model';
import { Cart } from '../models/Cart.model';
import { Product } from '../models/Product.model';
import {
  getStripeClient,
  validateStripeCheckoutConfiguration,
  isStripeWebhookConfigured,
  calculateTax,
  calculateShipping,
} from '../utils/stripe';
import { restoreOrderStock } from '../utils/orderStock';
import { reconcileOrderWithPaymentIntent } from '../utils/paymentReconciliation';

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw ApiError.unauthorized('Authentication required for checkout');
  }

  const { shippingAddress, billingAddress, paymentMethod = 'stripe' } = req.body;

  if (paymentMethod !== 'stripe') {
    throw ApiError.badRequest('Unsupported payment method');
  }

  validateStripeCheckoutConfiguration();
  const stripe = getStripeClient();

  // Get user's cart
  const cart = await Cart.findOne({ user: req.userId }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('Cart is empty');
  }

  // Verify stock and calculate totals
  let subtotal = 0;
  const orderItems: any[] = [];
  const stockReservations: Array<{
    productId: string;
    variantSku?: string;
    quantity: number;
  }> = [];
  let createdOrderId: string | null = null;
  let paymentIntentId: string | null = null;

  try {
    for (const cartItem of cart.items) {
      const cartProduct =
        cartItem.product && typeof cartItem.product === 'object' && '_id' in cartItem.product
          ? (cartItem.product as any)
          : null;
      const productId = cartProduct?._id?.toString() || cartItem.product.toString();
      const product = await Product.findById(productId);

      if (!product || !product.isActive) {
        const productName = cartProduct?.name || 'This product';
        throw ApiError.badRequest(`Product ${productName} is no longer available`);
      }

      // Check stock
      let availableStock = product.stock;
      let price = product.price;

      if (cartItem.variantSku) {
        const variant = product.variants.find((v) => v.sku === cartItem.variantSku);
        if (!variant) {
          throw ApiError.badRequest(`Variant not found for ${product.name}`);
        }
        availableStock = variant.stock;
        price = variant.price || product.price;
      }

      if (availableStock < cartItem.quantity) {
        throw ApiError.badRequest(`Insufficient stock for ${product.name}`);
      }

      // Deduct stock
      if (cartItem.variantSku) {
        const variant = product.variants.find((v) => v.sku === cartItem.variantSku);
        if (variant) {
          variant.stock -= cartItem.quantity;
        }
      } else {
        product.stock -= cartItem.quantity;
      }

      await product.save();
      stockReservations.push({
        productId: product._id.toString(),
        variantSku: cartItem.variantSku,
        quantity: cartItem.quantity,
      });

      subtotal += price * cartItem.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        sku: cartItem.variantSku,
        quantity: cartItem.quantity,
        price,
      });
    }

    // Calculate totals
    const shippingCost = calculateShipping(cart.items.length, subtotal);
    const tax = calculateTax(subtotal);
    const total = subtotal + shippingCost + tax;

    // Create order
    const order = await Order.create(
      {
        user: req.userId,
        items: orderItems,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        subtotal,
        shippingCost,
        tax,
        total,
        currency: 'INR',
        paymentStatus: 'pending',
        fulfillmentStatus: 'processing',
      }
    );
    createdOrderId = order._id.toString();

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'inr',
      metadata: {
        orderId: order._id.toString(),
        userId: req.userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    paymentIntentId = paymentIntent.id;

    if (!paymentIntent.client_secret) {
      throw ApiError.internal('Stripe did not return a payment client secret');
    }

    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    // Clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        clientSecret: paymentIntent.client_secret,
        publishableKey: config.stripe.publishableKey,
        webhookConfigured: isStripeWebhookConfigured(),
      },
    });
  } catch (error) {
    if (paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(paymentIntentId);
      } catch {
        // Ignore cleanup errors so the original checkout error surfaces.
      }
    }

    if (createdOrderId) {
      await Order.findByIdAndDelete(createdOrderId);
    }

    for (const reservation of stockReservations.reverse()) {
      const product = await Product.findById(reservation.productId);

      if (!product) {
        continue;
      }

      if (reservation.variantSku) {
        const variant = product.variants.find((candidate) => candidate.sku === reservation.variantSku);
        if (variant) {
          variant.stock += reservation.quantity;
        }
      } else {
        product.stock += reservation.quantity;
      }

      await product.save();
    }

    throw error;
  }
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.userId) {
    throw ApiError.unauthorized('Authentication required');
  }

  const order = await Order.findById(id);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (req.userId !== order.user.toString() && req.user?.role !== 'admin') {
    throw ApiError.forbidden('Access denied');
  }

  if (!order.stripePaymentIntentId) {
    throw ApiError.badRequest('This order does not have a Stripe payment intent to confirm.');
  }

  if (order.paymentStatus === 'paid') {
    res.json({
      success: true,
      data: {
        order,
        paymentOutcome: 'paid',
      },
    });
    return;
  }

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  const paymentOutcome = await reconcileOrderWithPaymentIntent(order, paymentIntent);

  res.json({
    success: true,
    data: {
      order,
      paymentOutcome,
    },
  });
});

export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw ApiError.unauthorized('Authentication required');
  }

  const { page = '1', limit = '10', status } = req.query;

  const filter: any = { user: req.userId };
  if (status) {
    filter.paymentStatus = status;
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .populate('items.product')
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await Order.findById(id).populate('items.product');

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Check if user owns this order or is admin
  if (
    req.userId !== order.user.toString() &&
    req.user?.role !== 'admin'
  ) {
    throw ApiError.forbidden('Access denied');
  }

  res.json({
    success: true,
    data: { order },
  });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await Order.findById(id);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (req.userId !== order.user.toString()) {
    throw ApiError.forbidden('Access denied');
  }

  if (order.paymentStatus === 'paid') {
    throw ApiError.badRequest('Cannot cancel paid order. Request a refund instead.');
  }

  if (order.fulfillmentStatus !== 'processing') {
    throw ApiError.badRequest('Order cannot be cancelled at this stage');
  }

  await restoreOrderStock(order._id.toString());

  order.fulfillmentStatus = 'cancelled';
  order.paymentStatus = 'failed';
  await order.save();

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: { order },
  });
});
