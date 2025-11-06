import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllOrders,
  updateOrderFulfillment,
  getAnalytics,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// All routes require admin authentication
router.use(authenticate, authorize('admin'));

// Validation rules
const updateFulfillmentValidation = [
  body('fulfillmentStatus')
    .optional()
    .isIn(['processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid fulfillment status'),
];

// Routes
router.get('/orders', getAllOrders);
router.put(
  '/orders/:id/fulfill',
  validate(updateFulfillmentValidation),
  updateOrderFulfillment
);
router.get('/analytics', getAnalytics);

export default router;
