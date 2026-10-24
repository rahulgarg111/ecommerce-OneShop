import { Link } from 'react-router-dom';
import { Compass, Sparkles } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';

const NotFoundPage = () => {
  const { open } = useAssistant();
  return (
    <div className="container-custom flex flex-col items-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
        <Compass className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-bold">This page wandered off</h1>
      <p className="mt-2 max-w-md text-ink-muted">
        We couldn't find what you were looking for. Head back to the shop, or tell our assistant what you need.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/products" className="btn-primary">Browse products</Link>
        <button onClick={() => open()} className="btn-outline">
          <Sparkles className="h-4 w-4" /> Ask the assistant
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
