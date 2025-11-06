import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { Category } from '../models/Category.model';

export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name slug')
      .sort('name')
      .lean();

    res.json({
      success: true,
      data: { categories },
    });
  }
);

export const getCategoryBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true }).populate(
      'parent',
      'name slug'
    );

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    res.json({
      success: true,
      data: { category },
    });
  }
);

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const categoryData = req.body;

    const existingCategory = await Category.findOne({ slug: categoryData.slug });
    if (existingCategory) {
      throw ApiError.conflict('Category with this slug already exists');
    }

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  }
);

export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    if (updates.slug) {
      const existingCategory = await Category.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      });
      if (existingCategory) {
        throw ApiError.conflict('Category with this slug already exists');
      }
    }

    const category = await Category.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  }
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  }
);
