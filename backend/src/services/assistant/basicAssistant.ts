import type { AssistantReply, ChatTurn } from './assistantCore';
import {
  ShopperContext,
  newArtifacts,
  findProducts,
  toProductCard,
  getOrdersTool,
  getCartTool,
  OrderCard,
} from './shopTools';

/**
 * Rule-based assistant used when no ANTHROPIC_API_KEY is configured (or the AI
 * call fails). Maps common shopping needs to catalog tags and answers order and
 * cart questions directly, so the chat keeps working in local demos.
 */

interface Need {
  match: RegExp;
  tags: string[];
  intro: string;
}

const NEEDS: Need[] = [
  { match: /\b(cook|cooking|healthy|healthier|diet|oil|fried|meal ?prep|kitchen|recipe|eat better)\b/i, tags: ['healthy-cooking', 'meal-prep', 'low-oil'], intro: 'Here are a few things that make healthier cooking easier — less oil, more veg and better portions:' },
  { match: /\b(cardio|run|running|jog|jogging|marathon|treadmill|cycling|hiit|endurance|5k|10k)\b/i, tags: ['cardio', 'running'], intro: 'For lots of cardio, these help with comfort, tracking your heart rate, hydration and recovery:' },
  { match: /\bgym ?(bag|session|sessions|kit)?\b|\bworkout\b/i, tags: ['gym-bag'], intro: 'Gym bag essentials I would pack for a session:' },
  { match: /\b(strength|weights?|lifting|muscle|dumbbell|kettlebell|bulk)\b/i, tags: ['strength-training'], intro: 'Strength-training picks for building muscle at the gym or at home:' },
  { match: /\b(yoga|stretch|stretching|pilates|mobility|flexib)/i, tags: ['yoga', 'mobility'], intro: 'For yoga and mobility, these are well-loved:' },
  { match: /\b(sleep|insomnia|tired|rest|bedtime)\b/i, tags: ['sleep'], intro: 'Some things that can help you sleep better:' },
  { match: /\b(home office|work from home|wfh|desk|office|productiv)/i, tags: ['home-office'], intro: 'To level up your home office:' },
  { match: /\b(travel|trip|flight|vacation|holiday|packing)\b/i, tags: ['travel'], intro: 'Travel picks for an easier trip:' },
  { match: /\b(camp|camping|hike|hiking|trek|trekking|outdoor)/i, tags: ['camping', 'hiking'], intro: 'Outdoor gear for camping and hiking:' },
  { match: /\b(coffee|espresso|brew)\b/i, tags: ['coffee-lover', 'coffee'], intro: 'For coffee lovers:' },
  { match: /\b(skin|skincare|face|acne|sunscreen|glow)\b/i, tags: ['skincare'], intro: 'A simple skincare lineup:' },
  { match: /\b(recover|recovery|sore|soreness|massage)\b/i, tags: ['recovery'], intro: 'Recovery gear to ease sore muscles:' },
  { match: /\b(gift|present|birthday|anniversary)\b/i, tags: ['gifts'], intro: 'Some gift ideas people love:' },
  { match: /\b(dog|cat|pet|puppy|kitten)\b/i, tags: ['pets'], intro: 'For your pet:' },
  { match: /\b(gaming|gamer|game)\b/i, tags: ['gaming'], intro: 'Gaming picks:' },
  { match: /\b(protein|supplement|nutrition|vitamin)\b/i, tags: ['protein', 'supplements', 'nutrition'], intro: 'Nutrition and supplements:' },
];

const ORDER_WORDS = /\b(order|orders|track|tracking|deliver|delivered|delivery|shipped|shipping|package|parcel|arrive|in transit|refund|cancel)/i;
const CART_WORDS = /\b(cart|basket|bag i saved|checkout)\b/i;

const formatInr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const stageText: Record<OrderCard['stage'], string> = {
  awaiting_payment: 'awaiting payment',
  processing: 'processing',
  in_transit: 'on its way',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

/** Pulls "under 5000" / "below ₹2,000" / "budget 3k" out of a message. */
function parseBudget(text: string): number | undefined {
  const m = text.match(/(?:under|below|less than|within|budget(?: of)?|max(?:imum)?|upto|up to)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)\s*(k)?/i);
  if (!m) return undefined;
  const value = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
  return value > 0 ? value : undefined;
}

export async function runBasicAssistant(history: ChatTurn[], ctx: ShopperContext): Promise<AssistantReply> {
  const artifacts = newArtifacts();
  const message = history[history.length - 1]?.content ?? '';
  const reply = (text: string): AssistantReply => ({ ...artifacts, mode: 'basic', reply: text });

  // Cart questions
  if (CART_WORDS.test(message) && !/add .* to (my )?cart/i.test(message)) {
    const cart = await getCartTool(ctx, artifacts);
    if (!cart.item_count) return reply("Your cart is empty right now. Tell me what you're shopping for and I'll suggest a few things!");
    const free = cart.subtotal_inr >= 1000 ? 'You qualify for free shipping.' : `Add ₹${Math.ceil(1000 - cart.subtotal_inr)} more for free shipping.`;
    return reply(`You have **${cart.item_count} item${cart.item_count > 1 ? 's' : ''}** in your cart, totalling **₹${cart.subtotal_inr.toLocaleString('en-IN')}**. ${free}`);
  }

  // Order questions
  if (ORDER_WORDS.test(message)) {
    const wantsActive = /\b(where|track|when|arriv|transit|coming|status)\b/i.test(message);
    const result: any = await getOrdersTool(ctx, { status: wantsActive ? 'active' : 'all', limit: 5 }, artifacts);
    if (result.error === 'not_signed_in') {
      return reply("I can check your orders once you're signed in — use **Sign in** at the top right. Your guest cart is kept when you log in.");
    }
    if (!result.total_orders_on_account) return reply("You haven't placed any orders yet. Want some recommendations to get started?");
    if (!artifacts.orders.length) {
      await getOrdersTool(ctx, { status: 'all', limit: 5 }, artifacts);
      return reply('Nothing is in transit right now — all your orders are delivered or closed. Here are your recent orders:');
    }
    const lines = artifacts.orders.map(
      (o) => `- **#${o.number}** (${o.items.map((i) => i.name).join(', ')}) — ${stageText[o.stage]}${o.trackingNumber ? `, tracking ${o.trackingNumber}` : ''}`
    );
    return reply(`Here's the latest on your ${wantsActive ? 'active ' : ''}orders:\n${lines.join('\n')}`);
  }

  // Product needs
  const budget = parseBudget(message);
  const matched = NEEDS.filter((need) => need.match.test(message));
  let products: any[] = [];
  if (matched.length) {
    // Best matches carry the primary need tag (e.g. "cardio"); related tags only fill gaps.
    const primary = [...new Set(matched.map((n) => n.tags[0]))];
    const related = [...new Set(matched.flatMap((n) => n.tags))];
    products = await findProducts({ tags: primary, max_price_inr: budget, limit: 6 });
    if (products.length < 6) {
      const seen = new Set(products.map((p) => String(p._id)));
      const more = await findProducts({ tags: related, max_price_inr: budget, limit: 12 });
      products.push(...more.filter((p) => !seen.has(String(p._id))).slice(0, 6 - products.length));
    }
  }
  if (!products.length) {
    const keywords = message.replace(/[^\w\s-]/g, ' ').replace(/\b(i|me|my|want|need|looking|for|some|something|help|show|find|buy|please|a|an|the|to|with|and|that|can|you)\b/gi, ' ');
    products = await findProducts({ query: keywords, max_price_inr: budget, limit: 6 });
  }

  if (!products.length) {
    return reply(
      "I couldn't find a great match for that. Try describing what you're doing — for example *\"I want to cook healthier\"*, *\"what should go in my gym bag\"* or *\"I do a lot of cardio\"* — or ask me about your orders."
    );
  }

  artifacts.products = products.map(toProductCard);
  const intro = matched[0]?.intro ?? 'Here are some products that match what you described:';
  const picks = products
    .slice(0, 4)
    .map((p) => `- **${p.name}** — ${formatInr(p.price)}${p.highlights?.[0] ? ` · ${p.highlights[0]}` : ''}`);
  const budgetNote = budget ? `\n\nAll picks are within your ₹${budget.toLocaleString('en-IN')} budget.` : '';
  return reply(`${intro}\n${picks.join('\n')}${budgetNote}`);
}
