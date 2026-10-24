/** Prices are stored in paise. */
export const formatPrice = (paise: number, withDecimals = false) =>
  `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })}`;

export const discountPercent = (price: number, compareAtPrice?: number) =>
  compareAtPrice && compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const FREE_SHIPPING_THRESHOLD = 100000; // ₹1,000 in paise
