import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { Order } from '../models/Order.model';
import { Cart } from '../models/Cart.model';
import { Product } from '../models/Product.model';
import { stripe, calculateTax, calculateShipping } from '../utils/stripe';

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw ApiError.unauthorized('Authentication required for checkout');
  }

  const { shippingAddress, billingAddress, paymentMethod = 'stripe' } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ user: req.userId }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('Cart is empty');
  }

  // Verify stock and calculate totals
  let subtotal = 0;
  const orderItems: any[] = [];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product._id).session(session);

      if (!product || !product.isActive) {
        throw ApiError.badRequest(`Product ${cartItem.product.name} is no longer available`);
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

      await product.save({ session });

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
      [
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
        },
      ],
      { session }
    );

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'inr',
      metadata: {
        orderId: order[0]._id.toString(),
        userId: req.userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    order[0].stripePaymentIntentId = paymentIntent.id;
    await order[0].save({ session });

    // Clear cart
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: order[0],
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripe.publicKey,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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

  order.fulfillmentStatus = 'cancelled';
  order.paymentStatus = 'failed';
  await order.save();

  // Restore stock
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        if (item.sku) {
          const variant = product.variants.find((v) => v.sku === item.sku);
          if (variant) {
            variant.stock += item.quantity;
          }
        } else {
          product.stock += item.quantity;
        }
        await product.save({ session });
      }
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: { order },
  });
});
