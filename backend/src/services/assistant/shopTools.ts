import mongoose from 'mongoose';
import { Product, IProduct } from '../../models/Product.model';
import { Category } from '../../models/Category.model';
import { Order, IOrder } from '../../models/Order.model';
import { Cart } from '../../models/Cart.model';

/** Who the assistant is talking to. Guests only have a cart sessionId. */
export interface ShopperContext {
  userId?: string;
  userName?: string;
  sessionId?: string;
}

/** Compact product shape sent to the browser to render product cards. */
export interface ProductCard {
  _id: string;
  name: string;
  slug: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  rating: number;
  reviewsCount: number;
  stock: number;
  category?: string;
}

export type OrderStage = 'awaiting_payment' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';

export interface OrderCard {
  _id: string;
  number: string;
  placedAt: string;
  stage: OrderStage;
  total: number;
  itemCount: number;
  items: { name: string; quantity: number; image?: string }[];
  trackingNumber?: string;
}

export interface CartCard {
  itemCount: number;
  subtotal: number;
  items: { name: string; slug?: string; quantity: number; price: number; image?: string }[];
}

/** Everything a chat turn produced for the UI besides the text reply. */
export interface TurnArtifacts {
  products: ProductCard[];
  orders: OrderCard[];
  cart?: CartCard;
  cartUpdated: boolean;
}

export const newArtifacts = (): TurnArtifacts => ({ products: [], orders: [], cartUpdated: false });

const rupees = (paise: number) => Math.round(paise) / 100;

export const toProductCard = (p: any): ProductCard => ({
  _id: String(p._id),
  name: p.name,
  slug: p.slug,
  brand: p.brand,
  price: p.price,
  compareAtPrice: p.compareAtPrice,
  image: p.images?.[0]?.url,
  rating: p.rating ?? 0,
  reviewsCount: p.reviewsCount ?? 0,
  stock: p.stock ?? 0,
  category: p.category?.name,
});

/** Product facts for the model to reason over (prices in rupees, not paise). */
const toProductFacts = (p: any) => ({
  id: String(p._id),
  name: p.name,
  brand: p.brand,
  category: p.category?.name,
  price_inr: rupees(p.price),
  mrp_inr: p.compareAtPrice ? rupees(p.compareAtPrice) : undefined,
  rating: p.rating,
  reviews: p.reviewsCount,
  in_stock: (p.stock ?? 0) > 0,
  highlights: p.highlights?.length ? p.highlights : undefined,
  summary: p.description?.length > 180 ? `${p.description.slice(0, 177)}...` : p.description,
  tags: p.tags,
});

// ───────────────────────── Catalog ─────────────────────────

export interface SearchInput {
  query?: string;
  tags?: string[];
  category?: string;
  max_price_inr?: number;
  min_rating?: number;
  limit?: number;
}

export async function findProducts(input: SearchInput): Promise<any[]> {
  const limit = Math.min(Math.max(Number(input.limit) || 8, 1), 12);
  const filter: Record<string, any> = { isActive: true };

  if (input.category) {
    const category = await Category.findOne({
      $or: [{ slug: input.category.toLowerCase() }, { name: new RegExp(`^${escapeRegex(input.category)}$`, 'i') }],
    })
      .select('_id')
      .lean();
    if (category) filter.category = category._id;
  }
  if (input.max_price_inr && input.max_price_inr > 0) {
    filter.price = { $lte: Math.round(input.max_price_inr * 100) };
  }
  if (input.min_rating && input.min_rating > 0) {
    filter.rating = { $gte: input.min_rating };
  }
  if (input.tags?.length) {
    filter.tags = { $in: input.tags.map((t) => t.toLowerCase().trim()) };
  }

  const query = input.query?.trim();
  if (query) {
    // Weighted full-text search first (name > tags > brand > description)
    const textResults = await Product.find(
      { ...filter, $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, rating: -1 })
      .limit(limit)
      .populate('category', 'name slug')
      .lean();
    if (textResults.length) return textResults;

    // Fall back to partial word matching (e.g. "dumbell" won't stem-match, "dumb" will)
    const words = query.split(/\s+/).filter((w) => w.length > 2).map(escapeRegex);
    if (!words.length) return [];
    const pattern = new RegExp(words.join('|'), 'i');
    return Product.find({ ...filter, $or: [{ name: pattern }, { tags: pattern }, { description: pattern }] })
      .sort({ rating: -1, reviewsCount: -1 })
      .limit(limit)
      .populate('category', 'name slug')
      .lean();
  }

  return Product.find(filter)
    .sort({ featured: -1, rating: -1, reviewsCount: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .lean();
}

export async function searchProductsTool(input: SearchInput) {
  const products = await findProducts(input);
  if (!products.length) {
    return { results: [], note: 'No matching products. Try broader words, a different category, or no price limit.' };
  }
  return { results: products.map(toProductFacts) };
}

export async function listCategoriesTool() {
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort('name').lean(),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  const countById = new Map(counts.map((c: any) => [String(c._id), c.count]));
  return {
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      products: countById.get(String(c._id)) ?? 0,
    })),
  };
}

// ───────────────────────── Orders ─────────────────────────

export const orderStage = (order: Pick<IOrder, 'paymentStatus' | 'fulfillmentStatus'>): OrderStage => {
  if (order.fulfillmentStatus === 'cancelled' || order.paymentStatus === 'refunded') return 'cancelled';
  if (order.fulfillmentStatus === 'delivered') return 'delivered';
  if (order.fulfillmentStatus === 'shipped') return 'in_transit';
  if (order.paymentStatus === 'paid') return 'processing';
  return 'awaiting_payment';
};

const stageLabel: Record<OrderStage, string> = {
  awaiting_payment: 'Awaiting payment',
  processing: 'Processing (being packed)',
  in_transit: 'Shipped / in transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const toOrderCard = (order: any): OrderCard => ({
  _id: String(order._id),
  number: String(order._id).slice(-8).toUpperCase(),
  placedAt: new Date(order.createdAt).toISOString(),
  stage: orderStage(order),
  total: order.total,
  itemCount: order.items.reduce((n: number, i: any) => n + i.quantity, 0),
  items: order.items.map((i: any) => ({
    name: i.name,
    quantity: i.quantity,
    image: i.product?.images?.[0]?.url,
  })),
  trackingNumber: order.trackingNumber,
});

export async function getOrdersTool(
  ctx: ShopperContext,
  input: { status?: string; limit?: number },
  artifacts: TurnArtifacts
) {
  if (!ctx.userId) {
    return {
      error: 'not_signed_in',
      message: 'The shopper is browsing as a guest. Orders are only visible after signing in.',
    };
  }

  const all = await Order.find({ user: ctx.userId })
    .sort('-createdAt')
    .limit(50)
    .populate('items.product', 'images slug')
    .lean();

  const wanted = (input.status || 'all') as OrderStage | 'all' | 'active';
  const filtered = all.filter((o) => {
    const stage = orderStage(o);
    if (wanted === 'all') return true;
    if (wanted === 'active') return stage === 'processing' || stage === 'in_transit' || stage === 'awaiting_payment';
    return stage === wanted;
  });
  const limit = Math.min(Math.max(Number(input.limit) || 5, 1), 10);
  const orders = filtered.slice(0, limit);

  for (const order of orders) {
    if (!artifacts.orders.some((o) => o._id === String(order._id))) artifacts.orders.push(toOrderCard(order));
  }

  return {
    total_orders_on_account: all.length,
    matching: filtered.length,
    orders: orders.map((o) => ({
      order_number: String(o._id).slice(-8).toUpperCase(),
      placed_on: new Date(o.createdAt).toDateString(),
      status: stageLabel[orderStage(o)],
      payment: o.paymentStatus,
      items: o.items.map((i) => `${i.quantity} x ${i.name}`),
      total_inr: rupees(o.total),
      tracking_number: o.trackingNumber,
      notes: o.notes,
    })),
  };
}

// ───────────────────────── Cart ─────────────────────────

const cartFilter = (ctx: ShopperContext) =>
  ctx.userId ? { user: ctx.userId } : ctx.sessionId ? { sessionId: ctx.sessionId } : null;

export async function getCartTool(ctx: ShopperContext, artifacts: TurnArtifacts) {
  const filter = cartFilter(ctx);
  const cart = filter ? await Cart.findOne(filter).populate('items.product').lean() : null;
  const items = (cart?.items || []).filter((i: any) => i.product);

  const card: CartCard = {
    itemCount: items.reduce((n: number, i: any) => n + i.quantity, 0),
    subtotal: items.reduce((sum: number, i: any) => sum + i.priceAtPurchase * i.quantity, 0),
    items: items.map((i: any) => ({
      name: i.product.name,
      slug: i.product.slug,
      quantity: i.quantity,
      price: i.priceAtPurchase,
      image: i.product.images?.[0]?.url,
    })),
  };
  artifacts.cart = card;

  return {
    signed_in: Boolean(ctx.userId),
    item_count: card.itemCount,
    subtotal_inr: rupees(card.subtotal),
    free_shipping_threshold_inr: 1000,
    items: card.items.map((i) => ({ name: i.name, quantity: i.quantity, unit_price_inr: rupees(i.price) })),
  };
}

export async function addToCartTool(
  ctx: ShopperContext,
  input: { product_id?: string; quantity?: number },
  artifacts: TurnArtifacts
) {
  const filter = cartFilter(ctx);
  if (!filter) return { error: 'No cart session available. Ask the shopper to refresh the page.' };
  if (!input.product_id || !mongoose.isValidObjectId(input.product_id)) {
    return { error: 'Invalid product_id. Use an id returned by search_products.' };
  }
  const quantity = Math.min(Math.max(Math.floor(Number(input.quantity) || 1), 1), 10);

  const product = await Product.findById(input.product_id).lean<IProduct>();
  if (!product || !product.isActive) return { error: 'Product not found.' };

  let cart = await Cart.findOne(filter);
  if (!cart) cart = new Cart({ ...filter, items: [] });

  const existing = cart.items.find((i) => i.product.toString() === input.product_id && !i.variantSku);
  const newQuantity = (existing?.quantity ?? 0) + quantity;
  if (newQuantity > product.stock) {
    return { error: `Only ${product.stock} of "${product.name}" left in stock.` };
  }

  if (existing) existing.quantity = newQuantity;
  else cart.items.push({ product: product._id as mongoose.Types.ObjectId, quantity, priceAtPurchase: product.price });
  await cart.save();

  artifacts.cartUpdated = true;
  return { added: product.name, quantity_in_cart: newQuantity };
}

/**
 * Product cards for a written reply: every searched product the reply names, in the order it
 * mentions them. Saves the model a separate "show these products" round trip.
 */
export async function cardsMentionedIn(reply: string, candidateIds: string[], artifacts: TurnArtifacts) {
  const ids = [...new Set(candidateIds)].filter((id) => mongoose.isValidObjectId(id));
  if (!ids.length || !reply) return;
  const products = await Product.find({ _id: { $in: ids }, isActive: true }).populate('category', 'name slug').lean();
  const text = reply.toLowerCase();
  products
    .map((p) => ({ p, at: text.indexOf(p.name.toLowerCase()) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, 8)
    .forEach(({ p }) => {
      if (!artifacts.products.some((card) => card._id === String(p._id))) artifacts.products.push(toProductCard(p));
    });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
