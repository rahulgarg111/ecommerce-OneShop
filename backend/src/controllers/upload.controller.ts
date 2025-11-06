import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const getUploadSignature = asyncHandler(
  async (req: Request, res: Response) => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'ecommerce/products';

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      config.cloudinary.apiSecret
    );

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloudName: config.cloudinary.cloudName,
        apiKey: config.cloudinary.apiKey,
        folder,
      },
    });
  }
);

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.body;

  if (!publicId) {
    throw ApiError.badRequest('Public ID is required');
  }

  const result = await cloudinary.uploader.destroy(publicId);

  if (result.result !== 'ok') {
    throw ApiError.internal('Failed to delete image');
  }

  res.json({
    success: true,
    message: 'Image deleted successfully',
  });
});
