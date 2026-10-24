import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  LogOut,
  Menu,
  X,
  Search,
  User,
  Package,
  LayoutDashboard,
  Sparkles,
  ChevronDown,
  Truck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useAssistant } from '../../context/AssistantContext';
import { cartApi } from '../../api/cart';
import { categoriesApi } from '../../api/categories';
import { getSessionId } from '../../utils/sessionId';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { open: openAssistant } = useAssistant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(getSessionId()),
  });
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const cartCount = (cartData?.data?.cart?.items || []).reduce(
    (sum: number, item: { quantity: number }) => sum + item.quantity,
    0
  );
  const categories = categoriesData?.data?.categories || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    setMobileMenuOpen(false);
  };

  const stripClass = (active: boolean, extra = 'text-ink-soft hover:bg-slate-100 hover:text-ink') =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-primary-50 text-primary-700' : extra}`;
  const onProducts = pathname === '/products';
  const allActive = onProducts && !searchParams.get('category') && !searchParams.get('onSale') && !searchParams.get('tags');

  return (
    <header className="sticky top-0 z-40">
      {/* Promo bar */}
      <div className="bg-ink text-white">
        <div className="container-custom flex h-9 items-center justify-center gap-2 text-xs font-medium sm:justify-between">
          <p className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-accent-300" />
            Free shipping on orders over ₹1,000 · Easy 7-day returns
          </p>
          <button onClick={() => openAssistant()} className="hidden items-center gap-1.5 text-white/80 transition hover:text-white sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
            Not sure what you need? Ask our AI assistant
          </button>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container-custom flex h-16 items-center gap-4 lg:gap-8">
          <button className="-ml-2 rounded-lg p-2 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-fuchsia-600 text-white shadow-glow">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">
              One<span className="text-primary-600">Shop</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 md:block">
            <div className="relative mx-auto max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for products, brands and more"
                className="w-full rounded-full border border-slate-200 bg-slate-100/70 py-2.5 pl-11 pr-4 text-sm transition placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => openAssistant()}
              className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-50 to-fuchsia-50 px-3.5 py-2 text-sm font-semibold text-primary-700 ring-1 ring-primary-100 transition hover:ring-primary-300 lg:flex"
            >
              <Sparkles className="h-4 w-4" /> Ask AI
            </button>

            {isAuthenticated ? (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-slate-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {user?.name?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                  <span className="hidden max-w-[7rem] truncate text-sm font-medium text-ink sm:block">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lift animate-pop-in">
                    <div className="border-b border-slate-100 px-4 pb-2.5 pt-1">
                      <p className="truncate text-sm font-semibold">{user?.name}</p>
                      <p className="truncate text-xs text-ink-muted">{user?.email}</p>
                    </div>
                    <Link to="/orders" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-50">
                      <Package className="h-4 w-4 text-slate-500" /> My orders
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-50">
                        <LayoutDashboard className="h-4 w-4 text-slate-500" /> Admin dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-slate-100 hover:text-ink">
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}

            <Link to="/cart" className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-slate-100 hover:text-ink" aria-label="Cart">
              <span className="relative">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">Cart</span>
            </Link>
          </div>
        </div>

        {/* Category strip */}
        <nav className="hidden border-t border-slate-100 md:block">
          <div className="container-custom flex h-11 items-center gap-1 overflow-x-auto scrollbar-none">
            <Link to="/products" className={stripClass(allActive)}>
              All products
            </Link>
            <Link
              to="/products?onSale=true"
              className={stripClass(onProducts && searchParams.get('onSale') === 'true', 'font-semibold text-accent-600 hover:bg-accent-50')}
            >
              🔥 Deals
            </Link>
            {categories.map((c) => (
              <Link
                key={c._id}
                to={`/products?category=${c.slug}`}
                className={stripClass(onProducts && searchParams.get('category') === c.slug)}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto border-b border-slate-200 bg-white shadow-lift md:hidden animate-fade-up">
          <div className="container-custom space-y-4 py-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                className="input rounded-full pl-11"
              />
            </form>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openAssistant();
              }}
              className="flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white"
            >
              <Sparkles className="h-4 w-4" /> Ask the AI shopping assistant
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="chip justify-center">All products</Link>
              <Link to="/products?onSale=true" onClick={() => setMobileMenuOpen(false)} className="chip justify-center text-accent-600">🔥 Deals</Link>
              {categories.map((c) => (
                <Link key={c._id} to={`/products?category=${c.slug}`} onClick={() => setMobileMenuOpen(false)} className="chip justify-center text-center">
                  {c.name}
                </Link>
              ))}
            </div>
            {isAuthenticated && (
              <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm font-medium">
                <Package className="h-4 w-4" /> My orders
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm font-medium">
                <LayoutDashboard className="h-4 w-4" /> Admin dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
