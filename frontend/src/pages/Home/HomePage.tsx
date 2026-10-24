import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Send, Flame, TrendingUp, Star, PackageSearch } from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { mockProducts } from '../../data/mockProducts';
import { useAssistant } from '../../context/AssistantContext';
import ProductCard, { ProductCardSkeleton } from '../../components/product/ProductCard';
import SmartImage from '../../components/product/SmartImage';
import type { Product } from '../../types';

const img = (id: string, w = 800) => `https://images.unsplash.com/${id}?w=${w}&h=${w}&fit=crop&q=80`;

const GOALS = [
  {
    title: 'Cook healthier',
    text: 'Air fryers, steamers & low-oil cookware',
    tag: 'healthy-cooking',
    prompt: 'I want to cook healthier food at home',
    image: img('photo-1512621776951-a57141f2eefd', 600),
    tint: 'from-emerald-900/80',
  },
  {
    title: 'Crush your cardio',
    text: 'Shoes, trackers, hydration & recovery',
    tag: 'cardio',
    prompt: 'I do a lot of cardio — what gear would help me?',
    image: img('photo-1552674605-db6ffd4facb5', 600),
    tint: 'from-orange-900/80',
  },
  {
    title: 'Pack your gym bag',
    text: 'Everything for a great session',
    tag: 'gym-bag',
    prompt: 'Help me pack my gym bag for my gym sessions',
    image: img('photo-1517836357463-d25dfeac3438', 600),
    tint: 'from-slate-900/80',
  },
  {
    title: 'Work from home',
    text: 'Ergonomic desk setup essentials',
    tag: 'home-office',
    prompt: 'Help me set up a comfortable home office',
    image: img('photo-1593062096033-9a26b09da705', 600),
    tint: 'from-indigo-900/80',
  },
  {
    title: 'Sleep better',
    text: 'Pillows, masks & calming lighting',
    tag: 'sleep',
    prompt: "I'm not sleeping well — what could help?",
    image: img('photo-1631049307264-da0ec9d70304', 600),
    tint: 'from-violet-900/80',
  },
  {
    title: 'Weekend adventures',
    text: 'Camping, hiking & travel gear',
    tag: 'camping',
    prompt: "I'm going on a camping and hiking trip — what do I need?",
    image: img('photo-1504280390367-361c6d9f38f4', 600),
    tint: 'from-green-900/80',
  },
];

const HERO_PROMPTS = ['Help me cook healthier', 'Gym bag essentials', 'Gifts under ₹2,000', 'Where is my order?'];

const ProductRow = ({
  title,
  icon: Icon,
  link,
  products,
  isLoading,
}: {
  title: string;
  icon: typeof Flame;
  link: string;
  products: Product[];
  isLoading: boolean;
}) => (
  <section className="container-custom py-10">
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="section-title flex items-center gap-2.5">
        <Icon className="h-7 w-7 text-accent-500" />
        {title}
      </h2>
      <Link to={link} className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
        View all <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products.map((product) => <ProductCard key={product._id} product={product} />)}
    </div>
  </section>
);

const HomePage = () => {
  const { open } = useAssistant();
  const [prompt, setPrompt] = useState('');

  const featured = useQuery({
    queryKey: ['products', { featured: true, limit: 8 }],
    queryFn: () => productsApi.getProducts({ featured: true, limit: 8, sort: '-rating' }),
  });
  const deals = useQuery({
    queryKey: ['products', { onSale: true, limit: 4, sort: '-reviewsCount' }],
    queryFn: () => productsApi.getProducts({ onSale: true, limit: 4, sort: '-reviewsCount' }),
  });
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const featuredProducts: Product[] = featured.data?.data?.products || (featured.isError ? mockProducts : []);
  const dealProducts: Product[] = deals.data?.data?.products || (deals.isError ? mockProducts.slice(0, 4) : []);
  const categories = categoriesData?.data?.categories || [];

  const askAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return open();
    open(prompt);
    setPrompt('');
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-800 to-fuchsia-800 text-white">
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-primary-400/30 blur-3xl" />

        <div className="container-custom relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" /> New · AI shopping assistant
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Tell us your goal.
              <br />
              <span className="bg-gradient-to-r from-fuchsia-300 via-pink-200 to-amber-200 bg-clip-text text-transparent">
                We'll find the gear.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">
              From healthier cooking to marathon training — describe what you're working on and our assistant picks the
              right products. It can track your orders too.
            </p>

            <form onSubmit={askAssistant} className="mt-8 max-w-lg">
              <div className="flex items-center gap-2 rounded-2xl bg-white p-2 pl-4 shadow-lift">
                <Sparkles className="h-5 w-5 shrink-0 text-primary-500" />
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="I want to start running in the mornings…"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-slate-400"
                />
                <button type="submit" className="btn-primary px-4">
                  <span className="hidden sm:inline">Ask</span> <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {HERO_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => open(p)}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/20 transition hover:bg-white/20"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Collage */}
          <div className="relative hidden h-[460px] lg:block">
            <div className="absolute right-0 top-0 h-72 w-60 overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/10 rotate-3">
              <SmartImage src={img('photo-1542291026-7eec264c27ff')} alt="Running shoes" className="h-full w-full object-cover" />
            </div>
            <div className="absolute left-6 top-16 h-64 w-56 overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/10 -rotate-6">
              <SmartImage src={img('photo-1695089028114-ce28248f0ab9')} alt="Air fryer" className="h-full w-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-24 h-56 w-52 overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/10 rotate-2">
              <SmartImage src={img('photo-1505740420928-5e560c06d30e')} alt="Headphones" className="h-full w-full object-cover" />
            </div>
            {/* Floating assistant bubble */}
            <div className="absolute bottom-16 left-0 max-w-[15rem] rounded-2xl bg-white p-3.5 text-ink shadow-lift animate-pop-in">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-600">
                <Sparkles className="h-3.5 w-3.5" /> Assistant
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                For healthier cooking, start with the <b>Digital Air Fryer</b> — up to 90% less oil 🍟
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container-custom py-12">
          <h2 className="section-title mb-6">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 sm:gap-4">
            {categories.map((c) => (
              <Link
                key={c._id}
                to={`/products?category=${c.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200"
              >
                <SmartImage width={260} src={c.image} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Shop by goal */}
      <section className="bg-white py-14">
        <div className="container-custom">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="section-title">Shop by goal</h2>
              <p className="mt-1 text-ink-muted">Curated kits for what you're working towards — or let the assistant tailor one.</p>
            </div>
            <button onClick={() => open()} className="btn-outline self-start">
              <Sparkles className="h-4 w-4 text-primary-600" /> Build my own kit
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GOALS.map((goal) => (
              <div key={goal.tag} className="group relative h-56 overflow-hidden rounded-3xl">
                <SmartImage src={goal.image} alt={goal.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className={`absolute inset-0 bg-gradient-to-t ${goal.tint} via-black/20 to-transparent`} />
                <div className="absolute inset-x-5 bottom-5 text-white">
                  <h3 className="text-xl font-bold">{goal.title}</h3>
                  <p className="text-sm text-white/80">{goal.text}</p>
                  <div className="mt-3 flex gap-2">
                    <Link to={`/products?tags=${goal.tag}`} className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-100">
                      Shop the kit
                    </Link>
                    <button
                      onClick={() => open(goal.prompt)}
                      className="flex items-center gap-1 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/25"
                    >
                      <Sparkles className="h-3 w-3" /> Ask AI
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deals */}
      <ProductRow title="Today's deals" icon={Flame} link="/products?onSale=true" products={dealProducts} isLoading={deals.isLoading} />

      {/* Assistant banner */}
      <section className="container-custom py-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-fuchsia-600 p-8 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                <PackageSearch className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-2xl font-bold">Where's my order?</h3>
                <p className="mt-1 max-w-xl text-white/80">
                  Ask the assistant about anything you've bought — what's delivered, what's in transit, and what's still sitting in your cart.
                </p>
              </div>
            </div>
            <button onClick={() => open('Where are my orders?')} className="btn bg-white text-primary-700 hover:bg-slate-100">
              Check my orders <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured */}
      <ProductRow title="Top rated picks" icon={TrendingUp} link="/products?sort=-rating" products={featuredProducts} isLoading={featured.isLoading} />

      {/* Trust strip */}
      <section className="container-custom pb-16 pt-6">
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-3 sm:p-8">
          {[
            { stat: '4.6★', label: 'Average product rating' },
            { stat: '100+', label: 'Hand-picked products across 10 categories' },
            { stat: '24/7', label: 'AI help with picking & orders' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <Star className="h-8 w-8 shrink-0 fill-amber-400 text-amber-400" />
              <div>
                <p className="font-display text-2xl font-extrabold">{item.stat}</p>
                <p className="text-sm text-ink-muted">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
