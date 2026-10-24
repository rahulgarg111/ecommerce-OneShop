import {
  ShopperContext,
  TurnArtifacts,
  searchProductsTool,
  listCategoriesTool,
  getOrdersTool,
  getCartTool,
  addToCartTool,
} from './shopTools';

/** Provider-neutral pieces of the shopping assistant: prompt, tool schemas and tool runner. */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantReply extends TurnArtifacts {
  reply: string;
  mode: 'ai' | 'basic';
}

export const SYSTEM_PROMPT = `You are the OneShop shopping assistant, a friendly and knowledgeable guide inside an Indian online store (prices in ₹ INR).

You help shoppers in two ways:
1. Finding products for a goal or lifestyle need. Shoppers often describe a need rather than a product — "I want to cook healthier", "what should I pack in my gym bag", "I do a lot of cardio", "setting up a home office". Work out what would actually help, then search the catalog for it. Think in terms of a small, useful kit: for healthier cooking that could be an air fryer, a steamer, low-oil cookware and a kitchen scale; for cardio, good running shoes, a heart-rate tracker, hydration and recovery gear. Run several focused searches (one per product type or need tag) rather than one vague search.
2. Answering questions about the shopper's own orders and cart — what has been delivered, what is in transit, what is still processing, and what is sitting in their cart.

How to work:
- Only recommend products that search_products returned. Never invent products, prices, stock or order details.
- Name every product you recommend using its exact catalog name in **bold** (usually 3-6 picks, best first). The store automatically shows a product card, with an add-to-cart button, for each product you name.
- Be quick: do all the searches you need in a single step (several search_products calls at once), then answer.
- Mention each pick briefly with why it fits their need. Respect any budget they give (use max_price_inr). Flag anything out of stock.
- Catalog tags you can search for include need tags such as: healthy-cooking, meal-prep, low-oil, cardio, running, hiit, gym-bag, strength-training, home-workout, yoga, recovery, hydration, sleep, home-office, travel, camping, hiking, skincare, coffee-lover, gaming, smart-home, gifts, pets.
- For order questions call get_orders (use status "active" for "where is my stuff"-style questions). For cart questions call get_cart. If the shopper is a guest, explain that they need to sign in to see orders; their guest cart still works.
- Only call add_to_cart when the shopper clearly asks you to add something. Confirm what was added.
- If a request is unrelated to shopping at OneShop, answer briefly and steer back to how you can help them shop.

Style: warm, concise and practical. Use short paragraphs or a short bulleted list with **bold** product names. Show prices as ₹ amounts. Keep replies under about 150 words unless the shopper asks for detail. Don't paste product ids or URLs — the cards handle that.`;

export const shopperContextNote = (ctx: ShopperContext) =>
  ctx.userId
    ? `The shopper is signed in as ${ctx.userName || 'a customer'}. Today is ${new Date().toDateString()}.`
    : `The shopper is browsing as a guest (not signed in). Today is ${new Date().toDateString()}.`;

/** Tool definitions as plain JSON Schema, so any LLM provider can use them. */
export const TOOL_DEFINITIONS = [
  {
    name: 'search_products',
    description:
      'Search the OneShop catalog. Use a short keyword query (a product type like "air fryer", or a need like "cardio") and/or need tags. Returns up to `limit` products with id, price in INR, rating, stock and highlights. Call several times with different queries to cover different product types.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords, e.g. "air fryer", "running shoes", "protein".' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional need/product tags to match any of, e.g. ["healthy-cooking"] or ["gym-bag"].',
        },
        category: {
          type: 'string',
          description:
            'Optional category slug: electronics, fashion, sports, home-kitchen, health-wellness, beauty, books, travel-outdoors, office, pets.',
        },
        max_price_inr: { type: 'number', description: 'Optional budget ceiling per item in rupees.' },
        min_rating: { type: 'number', description: 'Optional minimum star rating (0-5).' },
        limit: { type: 'integer', description: 'Max results, 1-12. Default 8.' },
      },
    },
  },
  {
    name: 'list_categories',
    description: 'List store categories with descriptions and product counts. Useful when the shopper asks what the store sells.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_orders',
    description:
      "Get the signed-in shopper's orders with status (awaiting payment, processing, in transit, delivered, cancelled), items, totals and tracking numbers. Matching orders are also shown to the shopper as cards.",
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'active', 'awaiting_payment', 'processing', 'in_transit', 'delivered', 'cancelled'],
          description: '"active" = not yet delivered or cancelled. Default "all".',
        },
        limit: { type: 'integer', description: 'Max orders to return, 1-10. Default 5.' },
      },
    },
  },
  {
    name: 'get_cart',
    description: "Get what is currently in the shopper's cart (works for guests and signed-in shoppers). Also shows a cart summary card.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'add_to_cart',
    description: "Add a product to the shopper's cart. Only use when the shopper explicitly asks to add something.",
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product id from search_products.' },
        quantity: { type: 'integer', description: 'Quantity to add, 1-10. Default 1.' },
      },
      required: ['product_id'],
    },
  },
];

/** Runs one tool call. Inputs come from the model, so every field is checked before use. */
export async function runShopTool(
  name: string,
  input: Record<string, any>,
  ctx: ShopperContext,
  artifacts: TurnArtifacts
): Promise<unknown> {
  switch (name) {
    case 'search_products':
      return searchProductsTool({
        query: typeof input.query === 'string' ? input.query : undefined,
        tags: Array.isArray(input.tags) ? input.tags.filter((t: unknown) => typeof t === 'string') : undefined,
        category: typeof input.category === 'string' ? input.category : undefined,
        max_price_inr: Number(input.max_price_inr) || undefined,
        min_rating: Number(input.min_rating) || undefined,
        limit: Number(input.limit) || undefined,
      });
    case 'list_categories':
      return listCategoriesTool();
    case 'get_orders':
      return getOrdersTool(ctx, { status: input.status, limit: input.limit }, artifacts);
    case 'get_cart':
      return getCartTool(ctx, artifacts);
    case 'add_to_cart':
      return addToCartTool(ctx, { product_id: input.product_id, quantity: input.quantity }, artifacts);
    default:
      return { error: `Unknown tool ${name}` };
  }
}
