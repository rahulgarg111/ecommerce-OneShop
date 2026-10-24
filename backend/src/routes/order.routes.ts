import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  checkout,
  confirmPayment,
  getOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Validation rules
const checkoutValidation = [
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.name').notEmpty().withMessage('Name is required'),
  body('shippingAddress.street').notEmpty().withMessage('Street is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode').notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone is required'),
];

const orderIdValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
];

// All routes require authentication
router.use(authenticate);

router.post('/checkout', validate(checkoutValidation), checkout);
router.post('/:id/confirm-payment', validate(orderIdValidation), confirmPayment);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);

export default router;
