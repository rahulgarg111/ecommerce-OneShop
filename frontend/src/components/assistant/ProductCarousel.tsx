import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../product/ProductCard';
import type { ProductCardData } from '../product/ProductCard';

/**
 * Horizontal row of product cards for the chat. Scrolls with the arrow buttons,
 * the mouse wheel, trackpad swipes, touch, or the thin scrollbar underneath.
 */
const ProductCarousel = ({ products }: { products: ProductCardData[] }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    // Images and fonts change card widths after first paint
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);

    // Let a normal (vertical) mouse wheel scroll the row sideways while it can still move.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // trackpad sideways swipe: browser handles it
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return; // let the chat scroll vertically instead
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, [updateArrows, products.length]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * (el.clientWidth - 40), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <p className="mb-1.5 text-[11px] font-medium text-ink-muted">
        {products.length} pick{products.length === 1 ? '' : 's'} for you{products.length > 2 && ' · scroll for more'}
      </p>

      <div
        ref={scrollerRef}
        onScroll={updateArrows}
        className="-mr-4 flex snap-x snap-proximity gap-2.5 overflow-x-auto scroll-smooth pb-2 pr-4 scrollbar-thin"
      >
        {products.map((product) => (
          <div key={product._id} className="snap-start">
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>

      {canLeft && (
        <button
          onClick={() => scrollByCards(-1)}
          aria-label="Previous products"
          className="absolute -left-3 top-[45%] flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-lift ring-1 ring-slate-200 transition hover:bg-primary-50 hover:text-primary-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scrollByCards(1)}
          aria-label="More products"
          className="absolute -right-2 top-[45%] flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-lift ring-1 ring-slate-200 transition hover:bg-primary-50 hover:text-primary-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default ProductCarousel;
