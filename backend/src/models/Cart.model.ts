import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  variantSku?: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface ICart extends Document {
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  items: ICartItem[];
  updatedAt: Date;
  createdAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variantSku: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  priceAtPurchase: {
    type: Number,
    required: true,
  },
});

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      index: true,
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true,
  }
);

// Ensure either user or sessionId is present
CartSchema.pre('save', function (next) {
  if (!this.user && !this.sessionId) {
    next(new Error('Cart must have either user or sessionId'));
  } else {
    next();
  }
});

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
