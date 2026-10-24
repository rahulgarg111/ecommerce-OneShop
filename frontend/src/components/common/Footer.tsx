import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react';

const PERKS = [
  { icon: Truck, title: 'Free shipping', text: 'On orders over ₹1,000' },
  { icon: RotateCcw, title: 'Easy returns', text: '7-day no-fuss returns' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'Encrypted with Stripe' },
  { icon: Headphones, title: 'Help anytime', text: 'AI assistant, 24/7' },
];

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', to: '/products' },
      { label: "Today's deals", to: '/products?onSale=true' },
      { label: 'Electronics', to: '/products?category=electronics' },
      { label: 'Sports & Fitness', to: '/products?category=sports' },
      { label: 'Home & Kitchen', to: '/products?category=home-kitchen' },
    ],
  },
  {
    title: 'Shop by goal',
    links: [
      { label: 'Healthy cooking', to: '/products?tags=healthy-cooking' },
      { label: 'Cardio & running', to: '/products?tags=cardio' },
      { label: 'Gym bag essentials', to: '/products?tags=gym-bag' },
      { label: 'Home office', to: '/products?tags=home-office' },
      { label: 'Better sleep', to: '/products?tags=sleep' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My orders', to: '/orders' },
      { label: 'Cart', to: '/cart' },
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
    ],
  },
];

const Footer = () => (
  <footer className="mt-auto bg-ink text-slate-300">
    <div className="border-b border-white/10">
      <div className="container-custom grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-primary-300 ring-1 ring-white/10">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-slate-400">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="container-custom grid grid-cols-2 gap-10 py-12 md:grid-cols-5">
      <div className="col-span-2">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-fuchsia-600 text-white">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-extrabold text-white">OneShop</span>
        </Link>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
          Everything you need, picked for how you live. Tell our AI assistant your goals and we'll find the right gear.
        </p>
      </div>
      {COLUMNS.map((col) => (
        <div key={col.title}>
          <h4 className="mb-4 text-sm font-semibold text-white">{col.title}</h4>
          <ul className="space-y-2.5 text-sm">
            {col.links.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-slate-400 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="border-t border-white/10">
      <div className="container-custom flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} OneShop. All rights reserved.</p>
        <p>Prices include GST where applicable · Made in India 🇮🇳</p>
      </div>
    </div>
  </footer>
);

export default Footer;
