import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
}

const Rating = ({ value, count, size = 'sm' }: RatingProps) => {
  if (!value) return null;
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const text = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex items-center gap-1 ${text}`}>
      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600 px-1.5 py-0.5 font-semibold text-white">
        {value.toFixed(1)}
        <Star className={`${icon} fill-white`} />
      </span>
      {count !== undefined && <span className="text-ink-muted">({count.toLocaleString('en-IN')})</span>}
    </div>
  );
};

export default Rating;
