import { Link } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import SmartImage from './SmartImage';
import Rating from './Rating';
import { useAddToCart } from '../../hooks/useAddToCart';
import { formatPrice, discountPercent } from '../../utils/format';

export interface ProductCardData {
  _id: string;
  name: string;
  slug: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  images?: { url: string }[];
  rating: number;
  reviewsCount: number;
  stock: number;
  category?: string | { name: string };
}

interface ProductCardProps {
  product: ProductCardData;
  /** Compact layout used inside the chat assistant */
  compact?: boolean;
}

const ProductCard = ({ product, compact = false }: ProductCardProps) => {
  const addToCart = useAddToCart();
  const [justAdded, setJustAdded] = useState(false);
  const image = product.image ?? product.images?.[0]?.url;
  const off = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.stock <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { productId: product._id, name: product.name },
      {
        onSuccess: () => {
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1500);
        },
      }
    );
  };

  if (compact) {
    return (
      <Link
        to={`/products/${product.slug}`}
        className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-primary-300 hover:shadow-soft"
      >
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <SmartImage src={image} width={180} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          {off > 0 && <span className="badge absolute left-2 top-2 bg-accent-500 text-white">{off}% off</span>}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-ink">{product.name}</p>
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-ink">{formatPrice(product.price)}</span>
            <button
              onClick={handleAdd}
              disabled={outOfStock || addToCart.isPending}
              aria-label={`Add ${product.name} to cart`}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:bg-slate-300"
            >
              {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <SmartImage
          src={image}
          alt={product.name}
          width={320}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="badge absolute left-3 top-3 bg-accent-500 text-white shadow-sm">{off}% OFF</span>
        )}
        {outOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Out of stock</span>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={addToCart.isPending}
            className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-xl bg-ink/90 py-2.5 text-sm font-semibold text-white opacity-0 backdrop-blur transition duration-300 hover:bg-primary-600 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100"
          >
            {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {justAdded ? 'Added' : 'Add to cart'}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.brand && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{product.brand}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-primary-700">
          {product.name}
        </h3>
        <Rating value={product.rating} count={product.reviewsCount} />
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-bold text-ink">{formatPrice(product.price)}</span>
          {off > 0 && (
            <span className="text-sm text-ink-muted line-through">{formatPrice(product.compareAtPrice!)}</span>
          )}
        </div>
        {!outOfStock && product.stock <= 15 && (
          <p className="text-xs font-medium text-accent-600">Only {product.stock} left</p>
        )}
      </div>
    </Link>
  );
};

export const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
    <div className="skeleton aspect-square rounded-none" />
    <div className="space-y-2 p-4">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-4 w-4/5" />
      <div className="skeleton h-4 w-1/4" />
    </div>
  </div>
);

export default ProductCard;
