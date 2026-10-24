import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, Send, RotateCcw, ShoppingCart, ChevronRight } from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';
import type { ChatMessage } from '../../context/AssistantContext';
import type { AssistantOrderCard, AssistantCartCard } from '../../api/assistant';
import { StatusPill } from '../order/OrderStatus';
import { useAuth } from '../../context/AuthContext';
import ProductCarousel from './ProductCarousel';
import SmartImage from '../product/SmartImage';
import MiniMarkdown from './MiniMarkdown';
import { formatPrice, formatDate } from '../../utils/format';

const STARTERS = [
  { emoji: '🥗', text: 'Help me cook healthier food' },
  { emoji: '🏋️', text: 'What should I pack in my gym bag?' },
  { emoji: '🏃', text: 'I do a lot of cardio — what would help?' },
  { emoji: '💻', text: 'Set up my home office under ₹15,000' },
  { emoji: '📦', text: 'Where are my orders?' },
  { emoji: '🛒', text: "What's in my cart?" },
];


const OrderMiniCard = ({ order }: { order: AssistantOrderCard }) => {
  return (
    <Link
      to={`/orders/${order._id}`}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-primary-300 hover:shadow-soft"
    >
      <div className="flex -space-x-3">
        {order.items.slice(0, 2).map((item, i) => (
          <SmartImage
            width={44}
            key={i}
            src={item.image}
            alt={item.name}
            className="h-11 w-11 rounded-lg border-2 border-white object-cover"
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink">#{order.number}</span>
          <StatusPill stage={order.stage} />
        </div>
        <p className="truncate text-xs text-ink-muted">
          {order.items.map((i) => i.name).join(', ')}
        </p>
        <p className="text-[11px] text-ink-muted">
          {formatDate(order.placedAt)} · {formatPrice(order.total)}
          {order.trackingNumber && order.stage === 'in_transit' && <> · {order.trackingNumber}</>}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
    </Link>
  );
};

const CartMiniCard = ({ cart }: { cart: AssistantCartCard }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
        <ShoppingCart className="h-3.5 w-3.5" /> Your cart · {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}
      </span>
      <span className="text-sm font-bold">{formatPrice(cart.subtotal)}</span>
    </div>
    <div className="space-y-1.5">
      {cart.items.slice(0, 4).map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <SmartImage width={32} src={item.image} alt={item.name} className="h-8 w-8 rounded-md object-cover" />
          <span className="flex-1 truncate">{item.name}</span>
          <span className="text-ink-muted">× {item.quantity}</span>
        </div>
      ))}
    </div>
    {cart.itemCount > 0 && (
      <Link to="/cart" className="btn-primary mt-3 w-full py-2 text-xs">
        Go to cart
      </Link>
    )}
  </div>
);

/** Typing dots plus what the assistant is doing (from the server, or a generic hint while waiting). */
const THINKING_STEPS = ['Looking through the store…', 'Comparing options for you…', 'Putting it together…', 'Almost there…'];
const TypingIndicator = ({ status }: { status?: string }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)), 5000);
    return () => clearInterval(timer);
  }, []);
  const text = status ?? THINKING_STEPS[step];
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 rounded-full bg-primary-400 animate-blink" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
      <span key={text} className="ml-2 text-xs text-ink-muted animate-fade-up">
        {text}
      </span>
    </div>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary-600 px-4 py-2.5 text-sm text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 animate-fade-up">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-fuchsia-500 text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div
          className={`rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed ${
            message.error ? 'bg-red-50 text-red-700' : 'bg-white text-ink-soft shadow-sm ring-1 ring-slate-200/70'
          }`}
        >
          {message.content ? (
            <>
              <MiniMarkdown text={message.content} />
              {message.streaming && (
                <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-blink rounded-sm bg-primary-400" />
              )}
            </>
          ) : (
            <TypingIndicator status={message.status} />
          )}
        </div>

        {!!message.products?.length && (
          <ProductCarousel products={message.products} />
        )}

        {!!message.orders?.length && (
          <div className="space-y-2">
            {message.orders.map((order) => (
              <OrderMiniCard key={order._id} order={order} />
            ))}
          </div>
        )}

        {message.cart && message.cart.itemCount > 0 && <CartMiniCard cart={message.cart} />}
      </div>
    </div>
  );
};

const ChatWidget = () => {
  const { isOpen, open, close, messages, send, isThinking, reset, mode } = useAssistant();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    void send(input);
    setInput('');
  };

  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      {/* Launcher */}
      {!isOpen && (
        <button
          onClick={() => open()}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-fuchsia-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-glow transition hover:scale-105 animate-pop-in"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">Ask Shopping Assistant</span>
          <span className="sm:hidden">Ask AI</span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Shopping assistant"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50 animate-pop-in sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-2.5rem))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-lift"
        >
          {/* Header */}
          <div className="relative flex items-center gap-3 bg-gradient-to-r from-primary-700 via-primary-600 to-fuchsia-600 px-4 py-3.5 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold">Shopping Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {mode === 'basic' ? 'Quick-match mode' : 'AI powered'} · products & orders
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={reset}
                title="Start a new chat"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button onClick={close} title="Close" className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.length === 0 ? (
              <div className="animate-fade-up">
                <h3 className="font-display text-xl font-bold text-ink">
                  Hi{firstName ? ` ${firstName}` : ''} 👋
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Tell me what you're working towards and I'll find products that fit — or ask about your orders and cart.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-ink-soft transition hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-800"
                    >
                      <span className="text-lg">{s.emoji}</span>
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}

          </div>

          {/* Composer */}
          <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 pl-3.5 transition focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-100">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e);
                }}
                rows={1}
                maxLength={2000}
                placeholder="e.g. I'm training for a 10K…"
                className="max-h-28 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-ink-muted">
              AI suggestions can be wrong — check product details before buying.
            </p>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
