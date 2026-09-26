import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/helpers';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-ink-700/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-xl shadow-brand-900/40"
          >
            <span className="font-display text-2xl font-bold text-white">CM</span>
          </motion.div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Electric Shop
          </h1>
          <p className="mt-2 text-sm text-brand-200/80">Copper & scrap trading POS</p>
        </div>

        <Card className="border-ink-200/80 shadow-xl shadow-ink-950/10" padding>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900">Sign in</h2>
              <p className="mt-1 text-sm text-ink-500">Enter your credentials to continue</p>
            </div>

            <Input
              label="Email or username"
              name="email"
              type="text"
              autoComplete="username"
              placeholder="admin@Electric Shop.com"
              value={form.email}
              onChange={handleChange}
              leftIcon={Mail}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              leftIcon={Lock}
              required
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign in
            </Button>

            <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/80 px-3 py-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <p className="text-xs leading-relaxed text-brand-800">
                Developed by Tech Wave Software House 0321-7165022
              </p>
            </div>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-400/70">
          © {new Date().getFullYear()} Electric Shop · Trading & Billing
        </p>
      </motion.div>
    </div>
  );
}
