import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Validation rules
const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('slug').trim().notEmpty().withMessage('Product slug is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

const updateStockValidation = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

// Public routes
router.get('/', getProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createProductValidation),
  createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  deleteProduct
);

router.patch(
  '/:id/stock',
  authenticate,
  authorize('admin'),
  validate(updateStockValidation),
  updateStock
);

export default router;
