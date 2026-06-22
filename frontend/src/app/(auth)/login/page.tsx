/**
 * Login Page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
        delivery_partner: '/delivery/dashboard',
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
    <div className="min-h-screen flex bg-surface-container-low font-body-md text-on-surface">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden bg-primary text-on-primary">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-fixed/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl" />
        <div className="absolute top-10 left-10 text-secondary-container animate-pulse opacity-50">
          <span className="material-symbols-outlined text-8xl">spark</span>
        </div>
        
        <div className="relative text-center max-w-sm z-10">
          <div className="w-20 h-20 bg-surface-container-lowest rounded-[24px] flex items-center justify-center mx-auto mb-8 shadow-xl">
            <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-4 leading-tight">
            Welcome Back To <span className="text-secondary-container">GreenHarvest</span>
          </h2>
          <p className="font-body-lg text-body-lg text-on-primary/80 leading-relaxed">
            Your trusted marketplace for fresh, sustainable produce straight from local farms.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { emoji: '🌾', label: '500+ Farmers' },
              { emoji: '🥦', label: '2,000+ Products' },
              { emoji: '🚚', label: 'Fast Delivery' },
              { emoji: '💯', label: 'Verified Quality' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-on-primary/10 backdrop-blur-sm border border-on-primary/20 rounded-[24px] px-5 py-4">
                <span className="text-2xl">{item.emoji}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-8">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 md:p-12 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-surface-container">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="font-headline-md text-headline-md font-bold text-on-background">
              Green<span className="text-primary">Harvest</span>
            </span>
          </div>

          <h1 className="font-headline-md text-[32px] font-bold text-on-background mb-2 text-center lg:text-left">Sign In</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-10 text-center lg:text-left">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary-container font-bold transition-colors">
              Sign up free
            </Link>
          </p>

          {errors.general && (
            <div className="flex items-start gap-3 bg-error-container border border-error/20 text-on-error-container rounded-[20px] p-4 mb-6">
              <span className="material-symbols-outlined shrink-0 mt-0.5">error</span>
              <p className="font-body-md text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-label-lg text-label-lg text-on-background mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">mail</span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className={`w-full pl-12 pr-4 py-4 bg-surface-container-low border rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${
                    errors.email ? 'border-error focus:ring-error-container' : 'border-outline-variant focus:border-primary focus:ring-primary-container/30'
                  }`}
                />
              </div>
              {errors.email && <p className="text-error font-body-md text-xs mt-2">{errors.email}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block font-label-lg text-label-lg text-on-background">
                  Password
                </label>
                <Link href="/forgot-password" className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className={`w-full pl-12 pr-12 py-4 bg-surface-container-low border rounded-[24px] text-on-background placeholder-on-surface-variant/50 text-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${
                    errors.password ? 'border-error focus:ring-error-container' : 'border-outline-variant focus:border-primary focus:ring-primary-container/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="text-error font-body-md text-xs mt-2">{errors.password}</p>}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="remember"
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary-container cursor-pointer"
              />
              <label htmlFor="remember" className="font-body-md text-sm text-on-surface-variant cursor-pointer">Remember me for 30 days</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-surface-tint text-on-primary font-label-lg text-[16px] py-4 rounded-full shadow-[0_10px_20px_rgba(40,108,0,0.2)] hover:-translate-y-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>Sign In <span className="material-symbols-outlined">arrow_forward</span></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-surface-container-lowest font-label-md text-xs text-on-surface-variant uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-4">
            <button type="button" className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-surface-container hover:border-primary/30 rounded-[20px] hover:bg-surface-container-low transition-all font-label-lg text-sm text-on-background cursor-pointer">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button type="button" className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-surface-container hover:border-primary/30 rounded-[20px] hover:bg-surface-container-low transition-all font-label-lg text-sm text-on-background cursor-pointer">
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
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
