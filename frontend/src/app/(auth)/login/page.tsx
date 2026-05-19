/**
 * Login Page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, Leaf, Eye, EyeOff } from 'lucide-react';
import Input from '@/components/common/Input';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Enter a valid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'At least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    try {
      const response = await api.login(formData.email, formData.password);
      const role = response.user?.role;
      const redirectMap: Record<string, string> = {
        admin: '/admin/dashboard',
        farmer: '/farmer/dashboard',
        delivery: '/delivery/dashboard',
        field_agent: '/agent/dashboard',
      };
      router.push(redirectMap[role] ?? '/buyer/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setErrors({ general: err.response?.data?.message || 'Invalid email or password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl" />
        <div className="relative text-center max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-heading text-3xl font-bold text-stone-900 mb-4">
            Welcome back to GreenHarvest
          </h2>
          <p className="text-stone-600 leading-relaxed">
            Your trusted marketplace for fresh, sustainable produce straight from local farms.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { emoji: '🌾', label: '500+ Farmers' },
              { emoji: '🥦', label: '2,000+ Products' },
              { emoji: '🚚', label: 'Same-day Delivery' },
              { emoji: '💯', label: 'Money-back Guarantee' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-white/60 rounded-2xl px-4 py-3">
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-medium text-stone-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-emerald-500 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg text-stone-900">
              Green<span className="text-violet-600">Harvest</span>
            </span>
          </div>

          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-1">Sign in</h1>
          <p className="text-stone-500 mb-8">
            Don't have an account?{' '}
            <Link href="/register" className="text-violet-600 hover:text-violet-800 font-semibold transition-colors">
              Sign up free
            </Link>
          </p>

          {errors.general && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className={`w-full pl-10 pr-4 py-3 bg-stone-50 border rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    errors.email ? 'border-red-400 focus:ring-red-100' : 'border-stone-200 focus:border-violet-400 focus:ring-violet-100'
                  }`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-stone-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className={`w-full pl-10 pr-10 py-3 bg-stone-50 border rounded-2xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                    errors.password ? 'border-red-400 focus:ring-red-100' : 'border-stone-200 focus:border-violet-400 focus:ring-violet-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-stone-600 cursor-pointer">Remember me for 30 days</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-stone-400 text-xs font-medium">Or continue with</span>
            </div>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700 cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button type="button" className="flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700 cursor-pointer">
              <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
