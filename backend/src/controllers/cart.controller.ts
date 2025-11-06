import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { Cart } from '../models/Cart.model';
import { Product } from '../models/Product.model';

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.query;

  let cart;

  if (req.userId) {
    // Get cart for logged-in user
    cart = await Cart.findOne({ user: req.userId }).populate('items.product');
  } else if (sessionId) {
    // Get cart for guest user
    cart = await Cart.findOne({ sessionId }).populate('items.product');
  }

  if (!cart) {
    return res.json({
      success: true,
      data: { cart: { items: [] } },
    });
  }

  res.json({
    success: true,
    data: { cart },
  });
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId, variantSku, quantity = 1, sessionId } = req.body;

  // Verify product exists and has stock
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw ApiError.notFound('Product not found');
  }

  // Check stock
  let availableStock = product.stock;
  let price = product.price;

  if (variantSku) {
    const variant = product.variants.find((v) => v.sku === variantSku);
    if (!variant) {
      throw ApiError.notFound('Product variant not found');
    }
    availableStock = variant.stock;
    price = variant.price || product.price;
  }

  if (availableStock < quantity) {
    throw ApiError.badRequest('Insufficient stock');
  }

  // Find or create cart
  let cart;
  const filter: any = {};

  if (req.userId) {
    filter.user = req.userId;
  } else if (sessionId) {
    filter.sessionId = sessionId;
  } else {
    throw ApiError.badRequest('Either authentication or sessionId is required');
  }

  cart = await Cart.findOne(filter);

  if (!cart) {
    cart = await Cart.create({
      ...filter,
      items: [],
    });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.variantSku === variantSku
  );

  if (existingItemIndex > -1) {
    // Update quantity
    cart.items[existingItemIndex].quantity += quantity;

    // Check stock again
    if (cart.items[existingItemIndex].quantity > availableStock) {
      throw ApiError.badRequest('Insufficient stock');
    }
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      variantSku,
      quantity,
      priceAtPurchase: price,
    });
  }

  await cart.save();
  await cart.populate('items.product');

  res.json({
    success: true,
    message: 'Item added to cart',
    data: { cart },
  });
});

export const updateCartItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { quantity, sessionId } = req.body;

    const filter: any = {};
    if (req.userId) {
      filter.user = req.userId;
    } else if (sessionId) {
      filter.sessionId = sessionId;
    } else {
      throw ApiError.badRequest('Either authentication or sessionId is required');
    }

    const cart = await Cart.findOne(filter);
    if (!cart) {
      throw ApiError.notFound('Cart not found');
    }

    const item = cart.items.find((i) => i._id?.toString() === itemId);
    if (!item) {
      throw ApiError.notFound('Item not found in cart');
    }

    // Verify stock
    const product = await Product.findById(item.product);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    let availableStock = product.stock;
    if (item.variantSku) {
      const variant = product.variants.find((v) => v.sku === item.variantSku);
      if (variant) {
        availableStock = variant.stock;
      }
    }

    if (quantity > availableStock) {
      throw ApiError.badRequest('Insufficient stock');
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product');

    res.json({
      success: true,
      message: 'Cart updated',
      data: { cart },
    });
  }
);

export const removeFromCart = asyncHandler(
  async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { sessionId } = req.query;

    const filter: any = {};
    if (req.userId) {
      filter.user = req.userId;
    } else if (sessionId) {
      filter.sessionId = sessionId;
    } else {
      throw ApiError.badRequest('Either authentication or sessionId is required');
    }

    const cart = await Cart.findOne(filter);
    if (!cart) {
      throw ApiError.notFound('Cart not found');
    }

    cart.items = cart.items.filter((item) => item._id?.toString() !== itemId);
    await cart.save();
    await cart.populate('items.product');

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: { cart },
    });
  }
);

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.query;

  const filter: any = {};
  if (req.userId) {
    filter.user = req.userId;
  } else if (sessionId) {
    filter.sessionId = sessionId;
  } else {
    throw ApiError.badRequest('Either authentication or sessionId is required');
  }

  const cart = await Cart.findOne(filter);
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.json({
    success: true,
    message: 'Cart cleared',
    data: { cart: { items: [] } },
  });
});

export const mergeCarts = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!req.userId || !sessionId) {
    throw ApiError.badRequest('Authentication and sessionId are required');
  }

  const [userCart, guestCart] = await Promise.all([
    Cart.findOne({ user: req.userId }),
    Cart.findOne({ sessionId }),
  ]);

  if (!guestCart || guestCart.items.length === 0) {
    return res.json({
      success: true,
      message: 'No guest cart to merge',
      data: { cart: userCart },
    });
  }

  if (!userCart) {
    // Convert guest cart to user cart
    guestCart.user = req.userId as any;
    guestCart.sessionId = undefined;
    await guestCart.save();
    await guestCart.populate('items.product');

    return res.json({
      success: true,
      message: 'Cart merged successfully',
      data: { cart: guestCart },
    });
  }

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingItemIndex = userCart.items.findIndex(
      (item) =>
        item.product.toString() === guestItem.product.toString() &&
        item.variantSku === guestItem.variantSku
    );

    if (existingItemIndex > -1) {
      userCart.items[existingItemIndex].quantity += guestItem.quantity;
    } else {
      userCart.items.push(guestItem);
    }
  }

  await userCart.save();
  await guestCart.deleteOne();
  await userCart.populate('items.product');

  res.json({
    success: true,
    message: 'Cart merged successfully',
    data: { cart: userCart },
  });
});
