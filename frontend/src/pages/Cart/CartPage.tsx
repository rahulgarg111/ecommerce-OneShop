import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, Truck, ShieldCheck, Sparkles, ArrowRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi } from '../../api/cart';
import { getSessionId } from '../../utils/sessionId';
import { useAuth } from '../../context/AuthContext';
import { useAssistant } from '../../context/AssistantContext';
import SmartImage from '../../components/product/SmartImage';
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '../../utils/format';
import type { CartItem } from '../../types';

// Mirrors the backend checkout rules (backend/src/utils/stripe.ts)
const SHIPPING_FEE = 5000;
const GST_RATE = 0.18;

const CartPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { open: openAssistant } = useAssistant();

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(getSessionId()),
  });
  const items: CartItem[] = (data?.data?.cart?.items || []).filter((i: CartItem) => i.product);

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateCartItem(itemId, quantity, getSessionId()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update cart'),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => cartApi.removeFromCart(itemId, getSessionId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Removed from cart');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to remove item'),
  });

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);
  const savings = items.reduce(
    (sum, i) => sum + Math.max(0, (i.product.compareAtPrice ?? 0) - i.priceAtPurchase) * i.quantity,
    0
  );
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = Math.round(subtotal * GST_RATE);
  const total = subtotal + shipping + tax;
  const toFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  if (isLoading) {
    return (
      <div className="container-custom grid gap-8 py-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
        <div className="skeleton h-80" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-custom flex flex-col items-center py-24 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-50">
          <ShoppingBag className="h-12 w-12 text-primary-500" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-ink-muted">Looks like you haven't added anything yet. Browse the store or let the assistant suggest something.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/products" className="btn-primary">Start shopping</Link>
          <button onClick={() => openAssistant()} className="btn-outline">
            <Sparkles className="h-4 w-4 text-primary-600" /> Get recommendations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-10">
      <h1 className="text-3xl font-bold">
        Shopping cart <span className="text-lg font-medium text-ink-muted">({itemCount} item{itemCount === 1 ? '' : 's'})</span>
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Free shipping progress */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary-600" />
              {toFreeShipping > 0 ? (
                <>Add <b>{formatPrice(toFreeShipping)}</b> more for free delivery</>
              ) : (
                <span className="text-emerald-700">🎉 You've unlocked free delivery!</span>
              )}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {items.map((item) => (
            <div key={item._id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <Link to={`/products/${item.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
                <SmartImage width={112} src={item.product.images?.[0]?.url} alt={item.product.name} className="h-full w-full object-cover" />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {item.product.brand && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{item.product.brand}</p>}
                    <Link to={`/products/${item.product.slug}`} className="line-clamp-2 font-semibold hover:text-primary-700">
                      {item.product.name}
                    </Link>
                    {item.variantSku && <p className="text-xs text-ink-muted">SKU: {item.variantSku}</p>}
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(item._id!)}
                    disabled={removeMutation.isPending}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-xl border border-slate-300">
                    <button
                      onClick={() => updateMutation.mutate({ itemId: item._id!, quantity: item.quantity - 1 })}
                      disabled={item.quantity <= 1 || updateMutation.isPending}
                      className="p-2 text-ink-soft disabled:opacity-30"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateMutation.mutate({ itemId: item._id!, quantity: item.quantity + 1 })}
                      disabled={updateMutation.isPending || item.quantity >= item.product.stock}
                      className="p-2 text-ink-soft disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatPrice(item.priceAtPurchase * item.quantity)}</p>
                    {item.quantity > 1 && <p className="text-xs text-ink-muted">{formatPrice(item.priceAtPurchase)} each</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => openAssistant("Based on what's in my cart, is there anything else I might need?")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 py-4 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
          >
            <Sparkles className="h-4 w-4" /> Ask the assistant what goes well with your cart
          </button>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-36 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-bold">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-medium">{formatPrice(subtotal)}</dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>You save</dt>
                  <dd className="font-medium">−{formatPrice(savings)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="font-medium">{shipping ? formatPrice(shipping) : <span className="text-emerald-700">Free</span>}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">GST (18%)</dt>
                <dd className="font-medium">{formatPrice(tax)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-baseline justify-between border-t border-slate-200 pt-5">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl font-extrabold">{formatPrice(total)}</span>
            </div>

            <button
              onClick={() => navigate(isAuthenticated ? '/checkout' : '/login', { state: { from: { pathname: '/checkout' } } })}
              className="btn-primary mt-6 w-full py-3.5 text-base"
            >
              {isAuthenticated ? (
                <>Proceed to checkout <ArrowRight className="h-5 w-5" /></>
              ) : (
                <><Lock className="h-4 w-4" /> Sign in to checkout</>
              )}
            </button>
            <Link to="/products" className="mt-3 block text-center text-sm font-medium text-primary-600 hover:text-primary-700">
              Continue shopping
            </Link>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <ShieldCheck className="h-4 w-4" /> Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
