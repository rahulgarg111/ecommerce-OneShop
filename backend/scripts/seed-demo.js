require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { categories, products } = require('./catalog-data');

// Demo shopper used to show off order tracking and the shopping assistant.
// Local/demo credentials only — never reuse them anywhere real.
const DEMO_USER = {
  name: 'Demo Shopper',
  email: 'demo@oneshop.test',
  password: 'DemoShopper#2026',
};

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    brand: { type: String, trim: true },
    highlights: [{ type: String, trim: true }],
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    images: [{ _id: false, url: String, public_id: String, alt: String }],
    category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    tags: [{ type: String, lowercase: true, trim: true }],
    variants: [{ _id: false, sku: String, attributes: Schema.Types.Mixed, price: Number, stock: Number }],
    stock: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, autoIndex: false }
);

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const ADDRESS = {
  name: DEMO_USER.name,
  street: '221 MG Road, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560038',
  country: 'India',
  phone: '+91 98765 43210',
};

async function ensureTextIndex() {
  // indexes() throws on a brand-new database where the collection doesn't exist yet
  const indexes = await Product.collection.indexes().catch(() => []);
  for (const index of indexes) {
    if (index.name === 'variants.sku_1') {
      await Product.collection.dropIndex(index.name);
    }
    // Only one text index is allowed per collection; replace any older one.
    if (index.key && index.key._fts === 'text' && index.name !== 'product_text_search') {
      await Product.collection.dropIndex(index.name);
    }
  }
  await Product.collection.createIndex(
    { name: 'text', description: 'text', tags: 'text', brand: 'text' },
    { weights: { name: 10, tags: 6, brand: 4, description: 1 }, name: 'product_text_search' }
  );
}

async function seedCatalog() {
  const categoryIdsBySlug = {};

  for (const category of categories) {
    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      { $set: { ...category, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    categoryIdsBySlug[category.slug] = doc._id;
  }

  const productIdsBySlug = {};
  for (const product of products) {
    const { categorySlug, compareAtPrice, ...data } = product;
    const update = { $set: { ...data, category: categoryIdsBySlug[categorySlug] } };
    if (compareAtPrice) update.$set.compareAtPrice = compareAtPrice;
    else update.$unset = { compareAtPrice: '' };

    const doc = await Product.findOneAndUpdate({ slug: product.slug }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();
    productIdsBySlug[product.slug] = doc;
  }

  return productIdsBySlug;
}

async function seedDemoShopper(productsBySlug) {
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const email = DEMO_USER.email.toLowerCase();

  let user = await users.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);
    const now = new Date();
    const { insertedId } = await users.insertOne({
      name: DEMO_USER.name,
      email,
      passwordHash,
      role: 'customer',
      addresses: [{ ...ADDRESS, _id: new mongoose.Types.ObjectId(), label: 'Home', isDefault: true }],
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    user = { _id: insertedId };
  }

  const line = (slug, quantity) => {
    const product = productsBySlug[slug];
    return { _id: new mongoose.Types.ObjectId(), product: product._id, name: product.name, quantity, price: product.price };
  };

  const makeOrder = (items, extra) => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal >= 100000 ? 0 : 5000;
    const tax = Math.round(subtotal * 0.18);
    return {
      user: user._id,
      items,
      shippingAddress: ADDRESS,
      billingAddress: ADDRESS,
      subtotal,
      shippingCost,
      tax,
      total: subtotal + shippingCost + tax,
      currency: 'INR',
      ...extra,
      updatedAt: extra.createdAt,
    };
  };

  // Recreate the demo shopper's history so the seed is repeatable.
  const orders = db.collection('orders');
  await orders.deleteMany({ user: user._id });
  await orders.insertMany([
    makeOrder([line('running-shoes', 1), line('insulated-steel-water-bottle-1l', 1)], {
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
      trackingNumber: 'DLV7781203IN',
      createdAt: daysAgo(24),
    }),
    makeOrder([line('digital-air-fryer-4-5l', 1), line('the-healthy-air-fryer-cookbook', 1)], {
      paymentStatus: 'paid',
      fulfillmentStatus: 'shipped',
      trackingNumber: 'BLR5530918IN',
      notes: 'Out for delivery within 2 days',
      createdAt: daysAgo(3),
    }),
    makeOrder([line('yoga-mat', 1), line('foam-roller', 1)], {
      paymentStatus: 'paid',
      fulfillmentStatus: 'processing',
      createdAt: daysAgo(1),
    }),
    makeOrder([line('wireless-headphones', 1)], {
      paymentStatus: 'refunded',
      fulfillmentStatus: 'cancelled',
      createdAt: daysAgo(40),
    }),
  ]);

  // A cart with a couple of things still waiting to be bought.
  const carts = db.collection('carts');
  const cartItems = [
    { slug: 'speed-jump-rope', quantity: 1 },
    { slug: 'whey-protein-1kg-chocolate', quantity: 1 },
  ].map(({ slug, quantity }) => ({
    _id: new mongoose.Types.ObjectId(),
    product: productsBySlug[slug]._id,
    quantity,
    priceAtPurchase: productsBySlug[slug].price,
  }));
  await carts.updateOne(
    { user: user._id },
    { $set: { items: cartItems, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  await ensureTextIndex();
  const productsBySlug = await seedCatalog();
  await seedDemoShopper(productsBySlug);

  const [categoryCount, productCount] = await Promise.all([
    Category.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true }),
  ]);

  console.log(`Seeded ${categoryCount} categories and ${productCount} active products.`);
  console.log(`Demo shopper ready: ${DEMO_USER.email} (password in backend/scripts/seed-demo.js)`);
}

main()
  .catch((error) => {
    console.error('Failed to seed demo data:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
