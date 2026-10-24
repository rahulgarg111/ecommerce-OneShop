import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Sparkles, SearchX, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { mockProducts } from '../../data/mockProducts';
import { mockCategories } from '../../data/mockCategories';
import { useAssistant } from '../../context/AssistantContext';
import ProductCard, { ProductCardSkeleton } from '../../components/product/ProductCard';
import type { Category, Product } from '../../types';

const SORTS = [
  { value: '', label: 'Newest' },
  { value: '-rating', label: 'Top rated' },
  { value: '-reviewsCount', label: 'Most popular' },
  { value: 'price', label: 'Price: low to high' },
  { value: '-price', label: 'Price: high to low' },
];

// Bounds in rupees; the API takes paise
const PRICE_RANGES = [
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 – ₹3,000', min: 1000, max: 3000 },
  { label: '₹3,000 – ₹10,000', min: 3000, max: 10000 },
  { label: '₹10,000 – ₹30,000', min: 10000, max: 30000 },
  { label: 'Over ₹30,000', min: 30000, max: 0 },
];

const RATINGS = [4.5, 4, 3.5];

const GOAL_LABELS: Record<string, string> = {
  'healthy-cooking': 'Healthy cooking',
  cardio: 'Cardio & running',
  'gym-bag': 'Gym bag essentials',
  'home-office': 'Home office',
  sleep: 'Better sleep',
  camping: 'Camping & hiking',
};

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { open: openAssistant } = useAssistant();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category');
  const tags = searchParams.get('tags');
  const sort = searchParams.get('sort') || '';
  const onSale = searchParams.get('onSale') === 'true';
  const minRating = Number(searchParams.get('minRating')) || undefined;
  const minPrice = Number(searchParams.get('minPrice')) || undefined;
  const maxPrice = Number(searchParams.get('maxPrice')) || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);

  const filters = {
    q: q || undefined,
    category: category || undefined,
    tags: tags || undefined,
    sort: sort || undefined,
    onSale: onSale || undefined,
    minRating,
    minPrice: minPrice ? minPrice * 100 : undefined,
    maxPrice: maxPrice ? maxPrice * 100 : undefined,
    page,
    limit: 12,
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.getProducts(filters),
    placeholderData: keepPreviousData,
  });

  const { data: categoriesData, isError: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
    staleTime: 5 * 60 * 1000,
  });
  const categories: Category[] = categoriesData?.data?.categories || (categoriesError ? mockCategories : []);

  // Offline fallback so the page still renders without the API
  const fallbackProducts = useMemo(() => {
    let list = [...mockProducts];
    if (category) list = list.filter((p) => p.category?.slug === category);
    if (q) list = list.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [category, q]);

  const products: Product[] = data?.data?.products || (isError ? fallbackProducts : []);
  const pagination = data?.data?.pagination;
  const total = pagination?.total ?? products.length;

  const update = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)));
    if (!('page' in changes)) params.delete('page');
    setSearchParams(params);
  };

  const goToPage = (p: number) => {
    update({ page: p > 1 ? String(p) : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCategory = categories.find((c) => c.slug === category);
  const title = q
    ? `Results for “${q}”`
    : tags && GOAL_LABELS[tags]
    ? GOAL_LABELS[tags]
    : onSale
    ? "Today's deals"
    : activeCategory?.name || 'All products';

  type FilterChip = { label: string; clear: Record<string, null> };
  const activeChips = ([
    q && { label: `“${q}”`, clear: { q: null } },
    activeCategory && { label: activeCategory.name, clear: { category: null } },
    tags && { label: GOAL_LABELS[tags] || tags, clear: { tags: null } },
    onSale && { label: 'On sale', clear: { onSale: null } },
    minRating && { label: `${minRating}★ & up`, clear: { minRating: null } },
    (minPrice || maxPrice) && {
      label: PRICE_RANGES.find((r) => r.min === (minPrice ?? 0) && r.max === (maxPrice ?? 0))?.label || 'Price',
      clear: { minPrice: null, maxPrice: null },
    },
  ] as (FilterChip | false | '' | 0 | undefined)[]).filter((c): c is FilterChip => Boolean(c));

  const filterPanel = (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Category</h3>
        <ul className="space-y-0.5">
          {[{ _id: 'all', slug: '', name: 'All products' } as Category, ...categories].map((c) => {
            const active = (category || '') === c.slug;
            return (
              <li key={c._id}>
                <button
                  onClick={() => update({ category: c.slug || null })}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-primary-50 font-semibold text-primary-700' : 'text-ink-soft hover:bg-slate-100'
                  }`}
                >
                  {c.name}
                  {active && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Price</h3>
        <div className="space-y-1">
          {PRICE_RANGES.map((range) => {
            const active = (minPrice ?? 0) === range.min && (maxPrice ?? 0) === range.max && (minPrice || maxPrice);
            return (
              <label key={range.label} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:bg-slate-100">
                <input
                  type="radio"
                  name="price"
                  checked={!!active}
                  onChange={() =>
                    update({
                      minPrice: range.min ? String(range.min) : null,
                      maxPrice: range.max ? String(range.max) : null,
                    })
                  }
                  className="h-4 w-4 accent-primary-600"
                />
                {range.label}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Customer rating</h3>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <button
              key={r}
              onClick={() => update({ minRating: minRating === r ? null : String(r) })}
              className={minRating === r ? 'chip-active' : 'chip'}
            >
              {r}★ & up
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-medium">Only show deals</span>
        <input
          type="checkbox"
          checked={onSale}
          onChange={(e) => update({ onSale: e.target.checked ? 'true' : null })}
          className="h-5 w-5 accent-primary-600"
        />
      </label>

      <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-fuchsia-50 p-4 ring-1 ring-primary-100">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
          <Sparkles className="h-4 w-4" /> Not sure what to pick?
        </p>
        <p className="mt-1 text-xs text-ink-soft">Describe what you need and the assistant will shortlist for you.</p>
        <button onClick={() => openAssistant()} className="btn-primary mt-3 w-full py-2 text-xs">
          Ask the assistant
        </button>
      </div>
    </div>
  );

  return (
    <div className="container-custom py-8">
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-36">{filterPanel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Title + controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {isLoading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'}`}
                {activeCategory?.description && !q && ` · ${activeCategory.description}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFiltersOpen(true)} className="btn-outline py-2 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value || null })}
                className="input w-auto cursor-pointer py-2 pr-9"
                aria-label="Sort products"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {q && !s.value ? 'Best match' : s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button key={chip.label} onClick={() => update(chip.clear)} className="chip bg-primary-50 border-primary-200 text-primary-700">
                  {chip.label} <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button onClick={() => setSearchParams(new URLSearchParams())} className="text-sm font-medium text-ink-muted hover:text-ink">
                Clear all
              </button>
            </div>
          )}

          {/* Grid */}
          <div className={`mt-6 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <SearchX className="h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-xl font-bold">No products match those filters</h2>
                <p className="mt-1 max-w-sm text-sm text-ink-muted">
                  Try removing a filter, or describe what you need and let the assistant find it.
                </p>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setSearchParams(new URLSearchParams())} className="btn-outline">
                    Clear filters
                  </button>
                  <button onClick={() => openAssistant(q ? `I'm looking for ${q}` : undefined)} className="btn-primary">
                    <Sparkles className="h-4 w-4" /> Ask the assistant
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-1.5">
              <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="btn-outline px-3 py-2" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${
                    p === page ? 'bg-primary-600 text-white shadow-glow' : 'bg-white text-ink-soft ring-1 ring-slate-200 hover:ring-primary-300'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === pagination.pages}
                className="btn-outline px-3 py-2"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-slate-50 shadow-lift animate-fade-up">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filterPanel}</div>
            <div className="border-t border-slate-200 bg-white p-4">
              <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full">
                Show {total} product{total === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
