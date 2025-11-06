import { Router } from 'express';
import { body } from 'express-validator';
import {
  getUploadSignature,
  deleteImage,
} from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Validation rules
const deleteImageValidation = [
  body('publicId').notEmpty().withMessage('Public ID is required'),
];

// Routes - require admin authentication
router.post('/signature', authenticate, authorize('admin'), getUploadSignature);
router.delete(
  '/image',
  authenticate,
  authorize('admin'),
  validate(deleteImageValidation),
  deleteImage
);

export default router;
