import mongoose, { Document, Schema } from 'mongoose';

export interface IProductImage {
  url: string;
  public_id: string;
  alt?: string;
}

export interface IProductVariant {
  sku: string;
  attributes: {
    size?: string;
    color?: string;
    [key: string]: any;
  };
  price?: number;
  stock: number;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  images: IProductImage[];
  category?: mongoose.Types.ObjectId;
  tags: string[];
  variants: IProductVariant[];
  stock: number;
  featured: boolean;
  rating: number;
  reviewsCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  alt: { type: String },
});

const ProductVariantSchema = new Schema<IProductVariant>({
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  attributes: {
    type: Schema.Types.Mixed,
    default: {},
  },
  price: {
    type: Number,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    images: [ProductImageSchema],
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    variants: [ProductVariantSchema],
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
