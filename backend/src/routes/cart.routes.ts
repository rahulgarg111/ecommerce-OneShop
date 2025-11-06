import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCarts,
} from '../controllers/cart.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Validation rules
const addToCartValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

const updateCartItemValidation = [
  param('itemId').isMongoId().withMessage('Invalid item ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

// Routes - all use optionalAuth to support both logged-in and guest users
router.get('/', optionalAuth, getCart);
router.post('/', optionalAuth, validate(addToCartValidation), addToCart);
router.put(
  '/:itemId',
  optionalAuth,
  validate(updateCartItemValidation),
  updateCartItem
);
router.delete('/:itemId', optionalAuth, removeFromCart);
router.delete('/', optionalAuth, clearCart);
router.post('/merge', optionalAuth, mergeCarts);

export default router;
