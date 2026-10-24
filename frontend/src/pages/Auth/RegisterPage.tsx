import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';

  const strength = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return void toast.error('Password must be at least 8 characters');
    if (password !== confirmPassword) return void toast.error('Passwords do not match');

    setLoading(true);
    try {
      await register(name, email, password);
      navigate(redirectTo, { replace: true });
    } catch {
      // Error toast is shown by AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="It takes less than a minute. Your guest cart comes with you.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Full name</label>
          <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < strength ? (strength <= 1 ? 'bg-red-400' : strength <= 2 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-ink-muted">{['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][strength]}</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;
