import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Check,
} from 'lucide-react';
import { productsApi } from '../../api/products';
import { useAddToCart } from '../../hooks/useAddToCart';
import { useAssistant } from '../../context/AssistantContext';
import SmartImage from '../../components/product/SmartImage';
import Rating from '../../components/product/Rating';
import ProductCard, { ProductCardSkeleton } from '../../components/product/ProductCard';
import { formatPrice, discountPercent, FREE_SHIPPING_THRESHOLD } from '../../utils/format';
import type { Product } from '../../types';

const deliveryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { open: openAssistant } = useAssistant();
  const addToCart = useAddToCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);

  // The page is reused when hopping between related products
  useEffect(() => {
    setSelectedImage(0);
    setSelectedVariant(undefined);
    setQuantity(1);
  }, [slug]);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getProductBySlug(slug!),
    enabled: !!slug,
  });
  const product = data?.data?.product;

  const { data: relatedData, isLoading: relatedLoading } = useQuery({
    queryKey: ['products', { related: product?._id }],
    queryFn: () => productsApi.getProducts({ category: product!.category!.slug, limit: 5, sort: '-rating' }),
    enabled: !!product?.category?.slug,
  });
  const related: Product[] = (relatedData?.data?.products || []).filter((p: Product) => p._id !== product?._id).slice(0, 4);

  if (isLoading) {
    return (
      <div className="container-custom grid gap-10 py-10 md:grid-cols-2">
        <div className="skeleton aspect-square rounded-3xl" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-9 w-3/4" />
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-28" />
          <div className="skeleton h-12" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-custom py-24 text-center">
        <h1 className="mb-2 text-2xl font-bold">Product not found</h1>
        <p className="mb-6 text-ink-muted">It may have been removed or the link is wrong.</p>
        <button onClick={() => navigate('/products')} className="btn-primary">
          Back to products
        </button>
      </div>
    );
  }

  const variant = product.variants?.find((v) => v.sku === selectedVariant);
  const price = variant?.price ?? product.price;
  const stock = variant?.stock ?? product.stock;
  const off = discountPercent(price, product.compareAtPrice);

  const add = (thenCheckout = false) => {
    if (stock < quantity) return;
    addToCart.mutate(
      { productId: product._id, name: product.name, quantity, variantSku: selectedVariant },
      { onSuccess: () => thenCheckout && navigate('/cart') }
    );
  };

  return (
    <div className="pb-16">
      {/* Breadcrumbs */}
      <div className="container-custom flex items-center gap-1.5 overflow-x-auto py-4 text-sm text-ink-muted scrollbar-none">
        <Link to="/" className="hover:text-ink">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link to="/products" className="hover:text-ink">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link to={`/products?category=${product.category.slug}`} className="whitespace-nowrap hover:text-ink">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate text-ink">{product.name}</span>
      </div>

      <div className="container-custom grid gap-10 md:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="md:sticky md:top-36 md:self-start">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
            <SmartImage src={product.images?.[selectedImage]?.url} alt={product.name} className="h-full w-full object-cover" />
            {off > 0 && <span className="badge absolute left-4 top-4 bg-accent-500 px-2.5 py-1 text-sm text-white">{off}% OFF</span>}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square overflow-hidden rounded-xl ring-2 transition ${
                    selectedImage === index ? 'ring-primary-600' : 'ring-transparent hover:ring-slate-300'
                  }`}
                >
                  <SmartImage src={image.url} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">{product.brand}</p>}
          <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-3">
            <Rating value={product.rating} count={product.reviewsCount} size="md" />
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-4xl font-extrabold">{formatPrice(price)}</span>
            {off > 0 && (
              <>
                <span className="text-lg text-ink-muted line-through">{formatPrice(product.compareAtPrice!)}</span>
                <span className="text-lg font-bold text-emerald-600">{off}% off</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">Inclusive of all taxes</p>

          <p className="mt-6 leading-relaxed text-ink-soft">{product.description}</p>

          {product.highlights && product.highlights.length > 0 && (
            <ul className="mt-5 space-y-2">
              {product.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Options</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.sku}
                    onClick={() => setSelectedVariant(v.sku)}
                    disabled={v.stock === 0}
                    className={`${selectedVariant === v.sku ? 'chip-active' : 'chip'} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {v.attributes.size || v.attributes.color || v.sku}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + actions */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-xl border border-slate-300 bg-white">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 text-ink-soft hover:text-ink" aria-label="Decrease quantity">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                disabled={quantity >= stock}
                className="p-3 text-ink-soft hover:text-ink disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className={`text-sm font-medium ${stock === 0 ? 'text-red-600' : stock <= 15 ? 'text-accent-600' : 'text-emerald-600'}`}>
              {stock === 0 ? 'Out of stock' : stock <= 15 ? `Only ${stock} left — order soon` : 'In stock'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={() => add(false)} disabled={stock === 0 || addToCart.isPending} className="btn-outline py-3.5 text-base">
              <ShoppingBag className="h-5 w-5" /> Add to cart
            </button>
            <button onClick={() => add(true)} disabled={stock === 0 || addToCart.isPending} className="btn-primary py-3.5 text-base">
              <Zap className="h-5 w-5" /> Buy now
            </button>
          </div>

          <button
            onClick={() => openAssistant(`Is the ${product.name} a good fit for me, and what goes well with it?`)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-50 to-fuchsia-50 py-3 text-sm font-semibold text-primary-700 ring-1 ring-primary-100 transition hover:ring-primary-300"
          >
            <Sparkles className="h-4 w-4" /> Ask the assistant about this product
          </button>

          {/* Delivery & trust */}
          <div className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start gap-3 p-4">
              <Truck className="mt-0.5 h-5 w-5 text-primary-600" />
              <div className="text-sm">
                <p className="font-semibold">Delivery by {deliveryDate()}</p>
                <p className="text-ink-muted">
                  {price * quantity >= FREE_SHIPPING_THRESHOLD ? 'Free delivery on this order' : 'Free delivery on orders over ₹1,000'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4">
              <RotateCcw className="mt-0.5 h-5 w-5 text-primary-600" />
              <div className="text-sm">
                <p className="font-semibold">7-day easy returns</p>
                <p className="text-ink-muted">Changed your mind? Return it, no questions asked.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary-600" />
              <div className="text-sm">
                <p className="font-semibold">Secure checkout</p>
                <p className="text-ink-muted">Payments are encrypted and processed by Stripe.</p>
              </div>
            </div>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.slice(0, 8).map((tag) => (
                <Link key={tag} to={`/products?tags=${tag}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink-soft hover:bg-slate-200">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {(relatedLoading || related.length > 0) && (
        <section className="container-custom mt-20">
          <h2 className="section-title mb-6">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {relatedLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : related.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
