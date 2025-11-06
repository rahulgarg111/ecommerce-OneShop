import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { Product } from '../models/Product.model';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    tags,
    featured,
    sort = '-createdAt',
    page = '1',
    limit = '20',
  } = req.query;

  // Build filter query
  const filter: any = { isActive: true };

  if (q) {
    filter.$text = { $search: q as string };
  }

  if (category) {
    filter.category = category;
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (tags) {
    filter.tags = { $in: (tags as string).split(',') };
  }

  if (featured === 'true') {
    filter.featured = true;
  }

  // Pagination
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name slug')
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, isActive: true }).populate(
      'category',
      'name slug'
    );

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    res.json({
      success: true,
      data: { product },
    });
  }
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await Product.findById(id).populate('category', 'name slug');

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    res.json({
      success: true,
      data: { product },
    });
  }
);

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const productData = req.body;

    // Check if slug already exists
    const existingProduct = await Product.findOne({ slug: productData.slug });
    if (existingProduct) {
      throw ApiError.conflict('Product with this slug already exists');
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  }
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // If slug is being updated, check for duplicates
    if (updates.slug) {
      const existingProduct = await Product.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      });
      if (existingProduct) {
        throw ApiError.conflict('Product with this slug already exists');
      }
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  }
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  }
);

export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stock, variantSku } = req.body;

  const product = await Product.findById(id);

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  if (variantSku) {
    // Update variant stock
    const variant = product.variants.find((v) => v.sku === variantSku);
    if (!variant) {
      throw ApiError.notFound('Variant not found');
    }
    variant.stock = stock;
  } else {
    // Update product stock
    product.stock = stock;
  }

  await product.save();

  res.json({
    success: true,
    message: 'Stock updated successfully',
    data: { product },
  });
});
