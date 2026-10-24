import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Sparkles, Truck, PackageSearch } from 'lucide-react';

const PERKS = [
  { icon: Sparkles, text: 'Personal picks from the AI shopping assistant' },
  { icon: PackageSearch, text: 'Track every order in one place' },
  { icon: Truck, text: 'Free delivery on orders over ₹1,000' },
];

const AuthLayout = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <div className="container-custom py-10 lg:py-16">
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lift lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-950 via-primary-800 to-fuchsia-800 p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-extrabold">OneShop</span>
        </Link>
        <div className="relative mt-auto">
          <h2 className="text-3xl font-extrabold leading-tight">Shopping that knows what you're working towards.</h2>
          <ul className="mt-8 space-y-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form */}
      <div className="p-8 sm:p-12">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  </div>
);

export default AuthLayout;
