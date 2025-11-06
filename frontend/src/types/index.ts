export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  addresses?: Address[];
  emailVerified: boolean;
}

export interface Address {
  _id?: string;
  label?: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  images: ProductImage[];
  category?: Category;
  tags: string[];
  variants: ProductVariant[];
  stock: number;
  featured: boolean;
  rating: number;
  reviewsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  url: string;
  public_id: string;
  alt?: string;
}

export interface ProductVariant {
  sku: string;
  attributes: {
    size?: string;
    color?: string;
    [key: string]: any;
  };
  price?: number;
  stock: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: Category;
  image?: string;
  isActive: boolean;
}

export interface CartItem {
  _id?: string;
  product: Product;
  variantSku?: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface Cart {
  _id?: string;
  user?: string;
  sessionId?: string;
  items: CartItem[];
  updatedAt: string;
}

export interface OrderItem {
  product: string | Product;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
}

export interface Order {
  _id: string;
  user: string | User;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  fulfillmentStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[] | any;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
