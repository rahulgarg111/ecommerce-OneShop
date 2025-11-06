import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { Order } from '../models/Order.model';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    paymentStatus,
    fulfillmentStatus,
    search,
  } = req.query;

  const filter: any = {};

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (fulfillmentStatus) {
    filter.fulfillmentStatus = fulfillmentStatus;
  }

  if (search) {
    // Search by order ID or user email
    const users = await User.find({
      email: { $regex: search, $options: 'i' },
    }).select('_id');

    filter.$or = [
      { _id: search },
      { user: { $in: users.map((u) => u._id) } },
    ];
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name email')
      .populate('items.product', 'name slug')
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

export const updateOrderFulfillment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { fulfillmentStatus, trackingNumber, notes } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (fulfillmentStatus) {
      order.fulfillmentStatus = fulfillmentStatus;
    }

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    if (notes) {
      order.notes = notes;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { order },
    });
  }
);

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const dateFilter: any = {};
  if (startDate) {
    dateFilter.$gte = new Date(startDate as string);
  }
  if (endDate) {
    dateFilter.$lte = new Date(endDate as string);
  }

  const filter: any = {};
  if (Object.keys(dateFilter).length > 0) {
    filter.createdAt = dateFilter;
  }

  // Revenue analytics
  const revenueData = await Order.aggregate([
    { $match: { ...filter, paymentStatus: 'paid' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$total' },
      },
    },
  ]);

  // Top products
  const topProducts = await Order.aggregate([
    { $match: { ...filter, paymentStatus: 'paid' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        name: '$product.name',
        slug: '$product.slug',
        totalQuantity: 1,
        totalRevenue: 1,
      },
    },
  ]);

  // Order status breakdown
  const orderStatusBreakdown = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$fulfillmentStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  // User statistics
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments({ isActive: true });

  res.json({
    success: true,
    data: {
      revenue: revenueData[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
      },
      topProducts,
      orderStatusBreakdown,
      totalUsers,
      totalProducts,
    },
  });
});
